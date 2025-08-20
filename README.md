# Project Overview

[Unwrap Love](https://unwrap.love/) is a digital gifting platform designed to create, customize, and share meaningful experiences with loved ones.

## Project Team

This project is a group collaboration. The team members include:

- [MarlinDiary](https://github.com/MarlinDiary)  
- [ylin330](https://github.com/ylin330)  
- [Abdul-Muhammed](https://github.com/Abdul-Muhammed)  
- [anglaia](https://github.com/anglaia)  
- [SaikatBaidya](https://github.com/SaikatBaidya)  
- [miachillgood](https://github.com/miachillgood)  
- [LishaYUJ](https://github.com/LishaYUJ)  

## `/paper`

![Paper Feature Demo](assets/paper.gif)

- GIF, Sticker, AI, Photo, Note, Voice, Music, Doodle, Wallpaper
- Context menu support (redo, undo, duplicate, delete)
- Keyboard shortcuts
- Email delivery system with scheduled delivery option

## `/moodboard`

![Moodboard Feature Demo](assets/moodboard.gif)

- Collaborative mood board with real-time synchronization via Socket
- Multiple users can simultaneously create and arrange content
- Shared creative space for visual inspiration and planning

# Tech Stack

## Frontend

- **Framework:** Next.js
- **UI Libraries & Components:** React, Tailwind CSS, Framer Motion
- **Real-time Communication:** Socket.IO Client
- **Authentication:** Firebase
- **Email:** Resend
- **Graphics:** Giphy
- **Image Handling:** exif-js
- **Utilities:** unique-names-generator, uuid, Lucide Icons
- **Language:** TypeScript
- **Testing:** Jest

## Backend

- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB (with Mongoose ODM)
- **Real-time Communication:** Socket.IO
- **AI Integration:** OpenAI API

# Installation

## Environment
Environment configuration files are available at:

- `server/.env.example`
- `.env.example`

Before running the application, you must set up the environment first. For testing convenience, API keys have been included in the example files.

## Frontend
```bash
npm install

npm run dev
```

## Backend
```bash
cd server

npm install

npm run dev
```

## Testing

```bash
npm test
```

# Deployment

[https://unwrap.love](https://unwrap.love/) is deployed with the following infrastructure:

- Frontend deployed on [Vercel](https://vercel.com/)

- Backend and database hosted on [Railway](https://railway.app/)