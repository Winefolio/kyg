# KYG Product Pivot - Release Notes

**Date**: January 2026
**Version**: Pivot Release 1.0
**Live URL**: https://knowyourgrape-production.up.railway.app

---

## What Changed

KnowYourGrape has evolved from a host-focused group tasting platform into a comprehensive wine education ecosystem. Users can now learn about wine on their own terms.

### Three Ways to Use KYG

| Experience | What It Is | Who It's For |
|------------|-----------|--------------|
| **Solo Tastings** | Personal wine journal with AI wine recognition | Anyone wanting to track their tastings |
| **Learning Journeys** | Structured wine education with chapters | Users who want guided learning |
| **Group Sessions** | Host-led live tastings (original feature) | Events, classes, wine clubs |

---

## New Features

### 1. Solo Tasting Experience

**What it does**: Record and track your wine tastings to build your taste profile.

**Key features**:
- Email-only login (no password needed)
- Scan wine labels with your camera to auto-fill wine details
- Structured tasting questionnaire (look, smell, taste, overall)
- Personal taste profile that learns your preferences
- History of all your tastings

### 2. Learning Journeys

**What it does**: Follow guided wine education paths with structured chapters.

**Key features**:
- Browse journeys by difficulty (Beginner/Intermediate/Advanced)
- Filter by wine type (Red/White/Mixed)
- Each journey has multiple chapters
- Chapters include shopping tips and what to ask at the wine shop
- Progress tracking shows where you left off
- Wine validation ensures you're using the right type of wine for each chapter

### 3. Journey Admin

**What it does**: Create and manage learning journeys (for admins/sommeliers).

**Key features**:
- Create journeys with title, difficulty, wine type
- Add chapters with wine requirements and learning objectives
- Include shopping guides with price ranges and alternatives
- Publish/unpublish journeys

---

## How to Test

### Getting Started
1. Go to **https://knowyourgrape-production.up.railway.app**
2. You'll see entry points for all three experiences

### Test Solo Tastings
1. Click **"Solo Tasting"** from the homepage
2. Enter any email (e.g., `yourname@test.com`) - this creates your account
3. Click **"Start New Tasting"**
4. Either scan a wine label OR enter details manually
5. Complete the tasting questionnaire
6. Check your **Profile** to see your taste profile building

### Test Learning Journeys
1. Click **"Learning Journeys"** from the homepage
2. Browse the 3 available journeys:
   - Wine Tasting Fundamentals (Beginner)
   - Italian Wine Discovery (Intermediate)
   - French Wine Essentials (Beginner)
3. Click any journey to see chapters and progress
4. Click **"Start"** on a chapter to begin
5. Note: `andres@audos.com` already has progress on "Wine Tasting Fundamentals"

### Test Journey Admin
1. Go directly to `/admin/journeys`
2. Create a new journey using the form
3. Expand a journey to see/add chapters
4. Try editing and deleting

### Test Account with Existing Data
- Email: `andres@audos.com`
- Has 4 tastings and started one journey

---

## URLs Quick Reference

Base URL: **https://knowyourgrape-production.up.railway.app**

| Page | Path |
|------|------|
| Homepage | `/` |
| Solo Dashboard | `/solo` |
| New Tasting | `/solo/new` |
| Profile | `/solo/profile` |
| Journey Browser | `/journeys` |
| Journey Detail | `/journeys/3` (example) |
| Journey Admin | `/admin/journeys` |
| Sommelier Dashboard | `/sommelier` |

---

## Known Minor Issues

1. **Journey Admin link**: No navigation link from Sommelier Dashboard to Journey Admin yet - access via URL directly
2. **Some tastings show "-" for rating**: If overall rating wasn't submitted, displays dash instead of number

---

## What's NOT in This Release

- Wine recommendations based on your profile
- Gamification (streaks, badges, levels)
- Social sharing features
- Restaurant menu scanning

These are planned for future releases (see PRODUCT_ROADMAP.md).
