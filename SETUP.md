# Quick Setup Guide

## 🚀 Quick Start (Without Supabase)

If you just want to play the game locally without online multiplayer:

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```

3. **Open the Game**
   - Navigate to `http://localhost:3000`
   - Play single player vs AI
   - Play local multiplayer (2 players on same device)

## 🌐 Full Setup (With Online Multiplayer)

To enable online multiplayer features:

### 1. Set up Supabase Database

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for it to be ready

2. **Set up Database Schema**
   - Go to your project dashboard
   - Navigate to **SQL Editor**
   - Copy and paste the contents of `database-schema.sql`
   - Click **Run** to execute the SQL

3. **Get Your Credentials**
   - Go to **Settings** > **API**
   - Copy your **Project URL** and **anon public** key

### 2. Configure Environment Variables

1. **Create Environment File**
   ```bash
   copy test.env .env
   ```

2. **Edit .env File**
   ```bash
   # Replace with your actual Supabase credentials
   SUPABASE_URL=https://your-actual-project-id.supabase.co
   SUPABASE_ANON_KEY=your-actual-anon-key-here
   ```

3. **Restart the Server**
   ```bash
   npm start
   ```

## 🎮 Game Modes

### Available Without Supabase:
- ✅ **Player vs Computer** - 11 AI difficulty levels
- ✅ **Player vs Player** - Local multiplayer on same device
- ✅ **Sound Effects** - Full audio experience
- ✅ **Animations** - Visual effects for wins/losses
- ✅ **Themes** - Light and dark mode
- ✅ **Statistics** - Local game history

### Available With Supabase:
- ✅ **Online Multiplayer** - Play with friends anywhere
- ✅ **Room Management** - Create and join game rooms
- ✅ **Persistent Games** - Games survive server restarts
- ✅ **Automatic Cleanup** - Old rooms deleted automatically

## 🔧 Troubleshooting

### Server Won't Start
- Make sure you ran `npm install`
- Check if port 3000 is available
- Try a different port: `PORT=3001 npm start`

### Multiplayer Not Working
- Check if Supabase is configured correctly
- Verify your environment variables in `.env`
- Make sure you ran the database schema in Supabase

### Connection Issues
- Check your internet connection
- Verify Supabase project is active
- Check browser console for error messages

## 📱 Mobile Support

The game works on mobile devices:
- Touch-friendly interface
- Responsive design
- Sound effects work on mobile
- Online multiplayer works on mobile

## 🎯 Features Overview

- **11 AI Difficulty Levels** - From "Very Easy" to "Un-Beatable"
- **Real-time Multiplayer** - Play with friends online
- **Sound Effects** - Immersive audio feedback
- **Visual Animations** - Confetti, skeleton, and draw effects
- **Statistics Dashboard** - Track your performance
- **Theme Support** - Light and dark modes
- **Mobile Responsive** - Works on all devices
- **Automatic Cleanup** - No manual maintenance needed
