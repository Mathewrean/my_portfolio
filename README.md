# Portfolio Website

## Overview
This portfolio website showcases my professional background, skills, and projects in the field of cybersecurity. It serves as a digital resume and a platform to highlight my work and achievements.

## Project Structure
The project is organized as follows:

```
portfolio-website
├── docs                       # Build files for GitHub Pages deployment
│   ├── assets                 # Assets like images
│   ├── components             # HTML components including new challenge pages
│   │   ├── Home.html
│   │   ├── Resume.html
│   │   ├── Projects.html
│   │   ├── LabChallenges.html
│   │   ├── Contacts.html
│   │   ├── CTFChallenges.html
│   │   ├── TryHackMeRooms.html
│   │   └── HackTheBoxRooms.html
│   ├── scripts                # JavaScript files including projectsSlider.js
│   ├── styles                 # CSS styles
│   └── index.html             # Main entry point linking all components
├── package.json               # npm configuration file
└── README.md                  # Documentation for the project
```

## Features
- **Home Page**: Displays a professional photo, name, and a brief statement about my career in cybersecurity.
- **Resume Section**: Outlines my academic background, work experience, certifications, and skills.
- **Projects Section**: Showcases at least three projects with descriptions and technologies used, featuring a slider for navigation.
- **Lab Challenges Section**: Details completed lab challenges, including problem statements, approaches, tools used, and key lessons learned.
- **Challenge Pages**: Separate pages for CTF Challenges, TryHackMe Rooms, and Hack The Box Rooms linked from Lab Challenges.
- **Contacts Section**: Provides links to my professional profiles (LinkedIn, GitHub, Twitter, Facebook, Reddit, Instagram) and email for potential employers and collaborators.

## Setup Instructions
1. Clone the repository to your local machine.
2. Navigate to the project directory.
3. Install the necessary dependencies using npm:
   ```
   npm install
   ```
4. Open `src/index.html` in your web browser to view the portfolio website during development.

## GitHub Pages Deployment
To deploy the site on GitHub Pages:

1. Ensure the build files are in the `/docs` folder at the root of the repository.
2. In your GitHub repository, go to **Settings > Pages**.
3. Set the source branch to `main` and the folder to `/docs`.
4. Save the settings and visit:
   ```
   https://<your-username>.github.io/portfolio-website/
   ```
   or your custom domain if configured.

## Technologies Used
- HTML
- CSS
- JavaScript
- Font Awesome for icons

## Author
Mathewrean Otieno  
Cybersecurity Enthusiast | Digital Forensics | Ethical Hacker

## License
This project is licensed under the MIT License.
