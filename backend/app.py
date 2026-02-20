from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory

from .config import BASE_DIR, DOCS_DIR, MAX_CONTENT_LENGTH
from .db import migrate, seed_from_json
from .repository import (
    public_bundle,
    list_challenges,
    create_challenge,
    update_challenge,
    delete_challenge,
    list_certificates,
    list_projects,
    list_gallery,
    list_research,
    list_blog,
    create_or_update_simple,
    delete_simple,
    toggle_published,
    get_site_settings,
    update_site_settings,
    get_resume,
    update_resume,
)
from .services.uploads import ensure_upload_dirs, save_file, save_many, save_static_image
from .services.auth import verify_password, issue_token, requires_auth


def create_app():
    app = Flask(__name__, static_folder=str(DOCS_DIR), static_url_path="")
    app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

    ensure_upload_dirs()
    migrate()
    seed_from_json(BASE_DIR)

    @app.after_request
    def security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    @app.get("/api/public/content")
    def api_public_content():
        return jsonify(public_bundle())

    @app.get("/api/public/<resource>")
    def api_public_resource(resource):
        mapping = {
            "certificates": list_certificates(admin=False),
            "projects": list_projects(admin=False),
            "gallery": list_gallery(admin=False),
            "research": list_research(admin=False),
            "blog": list_blog(admin=False),
            "site": get_site_settings(),
            "resume": get_resume(),
        }
        data = mapping.get(resource)
        if data is None:
            return jsonify({"error": "Not found"}), 404
        return jsonify(data)

    @app.post("/api/admin/login")
    def admin_login():
        payload = request.get_json(silent=True) or {}
        if not verify_password(payload.get("password", "")):
            return jsonify({"error": "Invalid credentials"}), 401
        return jsonify({"token": issue_token()})

    @app.get("/api/admin/challenges")
    @requires_auth
    def admin_challenges_list():
        page = max(1, int(request.args.get("page", "1")))
        page_size = min(50, max(1, int(request.args.get("pageSize", "10"))))
        result = list_challenges(
            admin=True,
            search=request.args.get("search", "").strip(),
            category=request.args.get("category", "").strip(),
            status=request.args.get("status", "").strip(),
            page=page,
            page_size=page_size,
        )
        return jsonify(result)

    @app.post("/api/admin/challenges")
    @requires_auth
    def admin_challenges_create():
        form = dict(request.form)
        form["tags"] = form.get("tags", "")
        form["badge_thumbnail"] = save_file(request.files.get("badge_thumbnail"), "challenges") if request.files.get("badge_thumbnail") else form.get("badge_thumbnail", "")
        form["hero_image"] = save_file(request.files.get("hero_image"), "challenges") if request.files.get("hero_image") else form.get("hero_image", "")
        form["screenshots"] = save_many(request.files.getlist("screenshots"), "challenges")
        form["attachments"] = save_many(request.files.getlist("attachments"), "attachments", allow_docs=True)
        item = create_challenge(form)
        return jsonify(item), 201

    @app.put("/api/admin/challenges/<int:item_id>")
    @requires_auth
    def admin_challenges_update(item_id):
        form = dict(request.form)
        if request.files.get("badge_thumbnail"):
            form["badge_thumbnail"] = save_file(request.files.get("badge_thumbnail"), "challenges")
        if request.files.get("hero_image"):
            form["hero_image"] = save_file(request.files.get("hero_image"), "challenges")
        form["screenshots"] = save_many(request.files.getlist("screenshots"), "challenges")
        form["attachments"] = save_many(request.files.getlist("attachments"), "attachments", allow_docs=True)
        form["replace_screenshots"] = request.form.get("replace_screenshots", "") == "1"
        item = update_challenge(item_id, form)
        if not item:
            return jsonify({"error": "Not found"}), 404
        return jsonify(item)

    @app.delete("/api/admin/challenges/<int:item_id>")
    @requires_auth
    def admin_challenges_delete(item_id):
        if not delete_challenge(item_id):
            return jsonify({"error": "Not found"}), 404
        return "", 204

    @app.post("/api/admin/challenges/<int:item_id>/toggle")
    @requires_auth
    def admin_challenges_toggle(item_id):
        result = toggle_published("challenges", item_id)
        if result is None:
            return jsonify({"error": "Not found"}), 404
        return jsonify({"published": result})

    @app.post("/api/admin/static-upload/challenges")
    @requires_auth
    def admin_static_upload_challenge_image():
        file_storage = request.files.get("image")
        if not file_storage or not file_storage.filename:
            return jsonify({"error": "Missing image file"}), 400
        try:
            path = save_static_image(file_storage, "challenges")
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify({"path": path}), 201

    def register_simple_admin(resource, table, bucket, allow_docs=False):
        @requires_auth
        def _list():
            mapping = {
                "certificates": list_certificates(admin=True),
                "projects": list_projects(admin=True),
                "gallery": list_gallery(admin=True),
                "research": list_research(admin=True),
                "blog": list_blog(admin=True),
            }
            return jsonify(mapping[resource])

        @requires_auth
        def _create():
            form = dict(request.form)
            if resource == "projects":
                tech = form.get("technologies", "")
                form["technologies"] = [x.strip() for x in tech.split(",") if x.strip()]
                form["github_link"] = form.get("github_link", "")
                form["live_link"] = form.get("live_link", "")
                form["image_path"] = save_file(request.files.get("image"), bucket) if request.files.get("image") else form.get("image_path", "")
            elif resource == "certificates":
                form["image_path"] = save_file(request.files.get("image"), bucket, allow_docs=allow_docs) if request.files.get("image") else form.get("image_path", "")
            elif resource == "gallery":
                form["image_path"] = save_file(request.files.get("image"), bucket) if request.files.get("image") else form.get("image_path", "")
            elif resource == "research":
                form["publication_date"] = form.get("publication_date", "")
                if request.files.get("attachment"):
                    form["link"] = save_file(request.files.get("attachment"), "research", allow_docs=True)
            elif resource == "blog":
                if request.files.get("cover"):
                    form["link"] = save_file(request.files.get("cover"), "blog", allow_docs=True)
            form["published"] = 1 if form.get("published", "1") in {"1", "true", "on", "yes"} else 0
            item = create_or_update_simple(table, form)
            return jsonify(item), 201

        @requires_auth
        def _update(item_id):
            form = dict(request.form)
            if resource == "projects":
                if "technologies" in form:
                    form["technologies"] = [x.strip() for x in form.get("technologies", "").split(",") if x.strip()]
                if request.files.get("image"):
                    form["image_path"] = save_file(request.files.get("image"), bucket)
            elif resource == "certificates":
                if request.files.get("image"):
                    form["image_path"] = save_file(request.files.get("image"), bucket, allow_docs=allow_docs)
            elif resource == "gallery":
                if request.files.get("image"):
                    form["image_path"] = save_file(request.files.get("image"), bucket)
            elif resource == "research":
                if request.files.get("attachment"):
                    form["link"] = save_file(request.files.get("attachment"), "research", allow_docs=True)
            elif resource == "blog":
                if request.files.get("cover"):
                    form["link"] = save_file(request.files.get("cover"), "blog", allow_docs=True)
            item = create_or_update_simple(table, form, item_id=item_id)
            if not item:
                return jsonify({"error": "Not found"}), 404
            return jsonify(item)

        @requires_auth
        def _delete(item_id):
            if not delete_simple(table, item_id):
                return jsonify({"error": "Not found"}), 404
            return "", 204

        @requires_auth
        def _toggle(item_id):
            result = toggle_published(table, item_id)
            if result is None:
                return jsonify({"error": "Not found"}), 404
            return jsonify({"published": result})

        app.add_url_rule(f"/api/admin/{resource}", endpoint=f"admin_{resource}_list", view_func=_list, methods=["GET"])
        app.add_url_rule(f"/api/admin/{resource}", endpoint=f"admin_{resource}_create", view_func=_create, methods=["POST"])
        app.add_url_rule(f"/api/admin/{resource}/<int:item_id>", endpoint=f"admin_{resource}_update", view_func=_update, methods=["PUT"])
        app.add_url_rule(f"/api/admin/{resource}/<int:item_id>", endpoint=f"admin_{resource}_delete", view_func=_delete, methods=["DELETE"])
        app.add_url_rule(f"/api/admin/{resource}/<int:item_id>/toggle", endpoint=f"admin_{resource}_toggle", view_func=_toggle, methods=["POST"])

    register_simple_admin("certificates", "certificates", "certificates", allow_docs=True)
    register_simple_admin("projects", "projects", "projects")
    register_simple_admin("gallery", "gallery_items", "gallery")
    register_simple_admin("research", "research_items", "research", allow_docs=True)
    register_simple_admin("blog", "blog_posts", "blog", allow_docs=True)

    @app.get("/api/admin/settings")
    @requires_auth
    def admin_settings_get():
        return jsonify({"site": get_site_settings(), "resume": get_resume()})

    @app.put("/api/admin/settings/site")
    @requires_auth
    def admin_settings_site():
        payload = request.get_json(silent=True) or {}
        update_site_settings(payload)
        return jsonify({"ok": True})

    @app.put("/api/admin/settings/resume")
    @requires_auth
    def admin_settings_resume():
        payload = request.get_json(silent=True) or {}
        update_resume(payload)
        return jsonify({"ok": True})

    @app.get("/")
    def root():
        return app.send_static_file("index.html")

    @app.get("/admin")
    def admin_page():
        return app.send_static_file("admin.html")

    @app.get("/<path:path>")
    def static_proxy(path):
        file_path = DOCS_DIR / path
        if file_path.exists() and file_path.is_file():
            return send_from_directory(str(DOCS_DIR), path)
        return app.send_static_file("index.html")

    @app.errorhandler(413)
    def too_large(_):
        return jsonify({"error": "File too large. Max 8MB."}), 413

    @app.errorhandler(Exception)
    def fail(error):
        return jsonify({"error": str(error)}), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=4173, debug=False)
