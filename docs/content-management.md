# Content Management Guide

## 1) Update core profile data
Edit `data/site.json` for hero text, about paragraph, and contact links.

## 2) Add certificates
Edit `data/certificates.json` and add objects with:
- `name`
- `issuer`
- `date`
- `image` (URL or relative file path)

## 3) Add projects
Edit `data/projects.json` and include:
- `title`
- `description`
- `technologies` (array)
- `github`
- `demo`
- `image`

## 4) Add challenge writeups
Edit `data/challenges.json` under:
- `tryhackme`
- `hackthebox`
- `picoctf`
- `ctfroom`
- `others`

Each challenge supports:
- `title`
- `description`
- `image`
- `mediumLink`
- `dateCompleted`
- `tags`
- `difficulty`
- `sourceSite` and `ctfName` (for `others`)

## 5) TryHackMe badge
In `data/challenges.json`, update:
- `tryhackme.profileUrl`
- `tryhackme.badgeImage`

Example badge URL format:
`https://tryhackme-badges.s3.amazonaws.com/USERNAME.png`

## 6) Add research documents
Edit `data/research.json` with:
- `title`
- `description`
- `link`
- `date`

## 7) Add gallery images
Edit `data/gallery.json` with:
- `url`
- `caption`

## 8) Local challenge manager form
The form in the Challenges section stores entries in local storage only.
To clear form-added records, run in browser console:
`localStorage.removeItem('portfolioCustomChallenges')`
