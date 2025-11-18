# Personality System API Documentation

Complete guide for the Personality System with Statistics, Matching, and Regional Support.

---

## 📊 Table of Contents

1. [Overview](#overview)
2. [Statistics Endpoints](#statistics-endpoints)
3. [Matching Endpoints](#matching-endpoints)
4. [Profile Management](#profile-management)
5. [Frontend Integration Prompts](#frontend-integration-prompts)
6. [curl Examples](#curl-examples)
7. [Data Models](#data-models)

---

## 🎯 Overview

The Personality System provides:
- **Personality Profiling**: Answer questions to build your personality profile
- **Vector-based Matching**: Find similar profiles using AI embeddings
- **Statistics Tracking**: Public and private performance metrics
- **Regional Support**: Match with users in your region
- **Activity Tracking**: Streaks, workshops, tournaments

### Base URL
```
http://localhost:3000/api/v1/personality
```

---

## 📊 Statistics Endpoints

### 1. Get Global Statistics (Public)

**Endpoint:** `GET /statistics/global`
**Auth:** None (Public)

Returns platform-wide statistics including total profiles, active users, top ranked, and most active users.

```bash
curl -X GET "http://localhost:3000/api/v1/personality/statistics/global"
```

**Response:**
```json
{
  "totalProfiles": 1000,
  "activeProfiles": 750,
  "totalGamesPlayed": 50000,
  "totalWorkshopsAttended": 5000,
  "averageRank": 1200.5,
  "topRanked": [
    {
      "userId": "user123",
      "username": "ProPlayer",
      "rank": 2500,
      "totalWins": 150,
      "winRate": 75.5
    }
  ],
  "mostActive": [
    {
      "userId": "user456",
      "username": "ActiveUser",
      "currentStreak": 45,
      "totalActivityDays": 120
    }
  ],
  "regionalDistribution": {
    "Europe/Berlin": 300,
    "America/New_York": 250,
    "Asia/Tokyo": 200
  }
}
```

---

### 2. Get Public Statistics for a User

**Endpoint:** `GET /statistics/public/:userId`
**Auth:** None (Public)

Get publicly visible statistics for any user.

```bash
curl -X GET "http://localhost:3000/api/v1/personality/statistics/public/user123"
```

**Response:**
```json
{
  "userId": "user123",
  "username": "JohnPoker",
  "avatar": "https://example.com/avatar.jpg",
  "bio": "Passionate poker player",
  "region": "Europe/Berlin",
  "rank": 1500,
  "totalWins": 42,
  "totalGamesPlayed": 100,
  "tournamentParticipations": 15,
  "workshopsAttended": ["workshop-1", "workshop-2"],
  "workshopCompletions": [
    {
      "workshopId": "ws-1",
      "completedAt": "2025-01-15T10:00:00Z",
      "certificateUrl": "https://example.com/cert.pdf"
    }
  ],
  "totalActivityDays": 45,
  "currentStreak": 7,
  "longestStreak": 21,
  "lastActiveDate": "2025-01-18T12:00:00Z",
  "winRate": 42.0,
  "createdAt": "2024-01-01T10:00:00Z"
}
```

---

### 3. Get Private Statistics (Owner or Admin Only)

**Endpoint:** `GET /statistics/private/:userId`
**Auth:** Bearer Token (JWT)

Get detailed private statistics. Only accessible by the profile owner or admins.

```bash
curl -X GET "http://localhost:3000/api/v1/personality/statistics/private/user123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:** (Includes all public stats plus private data)
```json
{
  "userId": "user123",
  "username": "JohnPoker",
  // ... all public statistics ...
  "participatingEvents": ["event-1", "event-2"],
  "pastEvents": ["event-3", "event-4"],
  "totalHoursPlayed": 150.5,
  "matchesFound": 12,
  "testResults": {
    "pokerSkillLevel": 85,
    "businessAcumen": 75,
    "strategicThinking": 90,
    "riskTolerance": 70,
    "leadership": 80
  },
  "weights": {
    "poker": 0.4,
    "business": 0.3,
    "networking": 0.2,
    "learning": 0.1
  },
  "activityDays": {
    "2025-01-15": 5,
    "2025-01-16": 3,
    "2025-01-17": 7
  },
  "isActive": true,
  "updatedAt": "2025-01-18T12:00:00Z"
}
```

---

### 4. Get Own Private Statistics

**Endpoint:** `GET /statistics/me`
**Auth:** Bearer Token (JWT)

Convenient endpoint to get your own private statistics.

```bash
curl -X GET "http://localhost:3000/api/v1/personality/statistics/me" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔍 Matching Endpoints

### 1. Find Matches for Authenticated User

**Endpoint:** `GET /match?limit=10`
**Auth:** Bearer Token (JWT)

Find matching profiles based on personality similarity, region, and interests.

```bash
curl -X GET "http://localhost:3000/api/v1/personality/match?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "matches": [
    {
      "profileId": "507f1f77bcf86cd799439011",
      "userId": "user456",
      "score": 0.92,
      "generatedText": "This person is a strategic thinker with strong poker skills..."
    },
    {
      "profileId": "507f1f77bcf86cd799439012",
      "userId": "user789",
      "score": 0.87,
      "generatedText": "Passionate about business networking and poker tournaments..."
    }
  ],
  "totalMatches": 10
}
```

**Matching Factors:**
- **Personality Vector Similarity**: AI-based semantic matching
- **Regional Proximity**: Weighted by same region
- **Test Results Alignment**: Similar skill levels and interests
- **Preference Weights**: Matches based on poker, business, networking preferences

---

### 2. Find Matches for a Specific Profile

**Endpoint:** `GET /match/:profileId?limit=10`
**Auth:** Bearer Token (JWT)

Find matches for any profile by ID.

```bash
curl -X GET "http://localhost:3000/api/v1/personality/match/507f1f77bcf86cd799439011?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 👤 Profile Management

### 1. Submit Personality Answers

**Endpoint:** `POST /answers`
**Auth:** Bearer Token (JWT)

Submit answers to personality questionnaire. Creates or updates profile.

```bash
curl -X POST "http://localhost:3000/api/v1/personality/answers" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {
        "questionKey": "poker_experience",
        "answer": "advanced"
      },
      {
        "questionKey": "business_interests",
        "answer": ["startups", "investing", "networking"]
      },
      {
        "questionKey": "learning_goals",
        "answer": "Improve strategic thinking and risk assessment"
      }
    ]
  }'
```

---

### 2. Get Own Profile

**Endpoint:** `GET /profile`
**Auth:** Bearer Token (JWT)

```bash
curl -X GET "http://localhost:3000/api/v1/personality/profile" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 3. Get All Questions

**Endpoint:** `GET /questions`
**Auth:** None (Public)

Get all active personality questions.

```bash
curl -X GET "http://localhost:3000/api/v1/personality/questions"
```

---

## 🎨 Frontend Integration Prompts

### Prompt 1: Statistics Dashboard Component

```
Create a React component for a Personality Statistics Dashboard with the following requirements:

1. **Global Statistics Section:**
   - Display total profiles, active users
   - Show top 10 ranked users in a leaderboard
   - Display most active users with current streaks
   - Regional distribution pie chart
   - Use the endpoint: GET /api/v1/personality/statistics/global

2. **User Statistics Section:**
   - Public stats visible for any user
   - Private stats only for logged-in user viewing their own profile
   - Display rank, wins, win rate with progress bars
   - Show activity streak calendar heatmap
   - Workshop badges and certificates
   - Use endpoints:
     - GET /api/v1/personality/statistics/public/:userId
     - GET /api/v1/personality/statistics/me (for own stats)

3. **Design Requirements:**
   - Use TailwindCSS for styling
   - Responsive design (mobile-first)
   - Animated counters for numeric stats
   - Trophy/medal icons for top rankings
   - Color-coded activity streaks (red = broken, yellow = moderate, green = strong)

4. **Data Fetching:**
   - Use React Query for API calls
   - Handle loading states with skeletons
   - Error boundaries for failed requests
   - Auto-refresh every 60 seconds for live stats

5. **Features:**
   - Click on users in leaderboard to view their public profile
   - Filter by region dropdown
   - Toggle between different time ranges (7 days, 30 days, all time)
```

---

### Prompt 2: Matching Interface

```
Create a React component for a Personality Matching Interface:

1. **Match Discovery:**
   - Fetch matches: GET /api/v1/personality/match?limit=20
   - Display match score as percentage (0.92 = 92% match)
   - Show user avatar, username, bio, region
   - Display top 3 shared interests/skills

2. **Match Filters:**
   - Filter by region
   - Filter by minimum match score (slider 0-100%)
   - Filter by rank range
   - Sort by: match score, rank, activity

3. **Match Card Design:**
   - Card shows: avatar, username, match score badge, region flag
   - Hover effect reveals more details
   - "Connect" button to send match request
   - View full profile button

4. **Regional Matching:**
   - Highlight users from same region with a badge
   - Map view showing match locations (optional)
   - Region preference toggle (same region priority)

5. **Personality Insights:**
   - Show compatibility breakdown (poker, business, networking, learning)
   - Display as radar chart
   - Explain why profiles match (AI-generated summary)

Use shadcn/ui components, Recharts for visualizations, and Framer Motion for animations.
```

---

### Prompt 3: Profile Onboarding Flow

```
Create a multi-step personality profile onboarding flow:

1. **Step 1: Basic Info**
   - Username, avatar upload, bio
   - Region selector (dropdown with search)

2. **Step 2: Personality Questions**
   - Fetch questions: GET /api/v1/personality/questions
   - Dynamic form rendering based on question type
   - Progress indicator
   - Skip/back navigation

3. **Step 3: Test Results Input (Optional)**
   - Sliders for: poker skill level, business acumen, strategic thinking, risk tolerance, leadership
   - Range: 0-100

4. **Step 4: Preference Weights**
   - Interactive sliders for: poker, business, networking, learning
   - Total must sum to 1.0
   - Visual pie chart preview

5. **Step 5: Review & Submit**
   - Show summary of all inputs
   - Edit buttons for each section
   - Submit to: POST /api/v1/personality/answers
   - Success animation and redirect to dashboard

Use React Hook Form for validation, Zod for schema validation, and a stepper component.
```

---

### Prompt 4: Activity Tracking Widget

```
Create an Activity Tracking Widget component:

1. **Current Streak Display:**
   - Large number showing current streak
   - Fire emoji animation for streaks > 7 days
   - Longest streak badge

2. **Activity Heatmap:**
   - Calendar view (similar to GitHub contributions)
   - Color intensity based on activity level
   - Tooltip showing exact count on hover
   - Highlights today with border

3. **Workshops Section:**
   - List of attended workshops
   - Show completion certificates
   - Download certificate button
   - Share on LinkedIn button

4. **Stats Cards:**
   - Total activity days
   - Total hours played
   - Matches found
   - Tournaments participated

Use react-calendar-heatmap library and animate counters with countup.js.
```

---

## 🔧 curl Examples

### Complete Flow: Create Profile and Get Matches

```bash
# 1. Get available questions
curl -X GET "http://localhost:3000/api/v1/personality/questions"

# 2. Submit answers (requires auth)
curl -X POST "http://localhost:3000/api/v1/personality/answers" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      { "questionKey": "poker_experience", "answer": "advanced" },
      { "questionKey": "business_interests", "answer": ["startups", "investing"] },
      { "questionKey": "preferred_region", "answer": "Europe/Berlin" }
    ]
  }'

# 3. Get your profile
curl -X GET "http://localhost:3000/api/v1/personality/profile" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 4. Find matches
curl -X GET "http://localhost:3000/api/v1/personality/match?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 5. Get your private stats
curl -X GET "http://localhost:3000/api/v1/personality/statistics/me" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 6. View someone's public stats
curl -X GET "http://localhost:3000/api/v1/personality/statistics/public/user123"

# 7. Get global statistics
curl -X GET "http://localhost:3000/api/v1/personality/statistics/global"
```

---

### Admin Operations

```bash
# Create a question (admin only)
curl -X POST "http://localhost:3000/api/v1/personality/questions" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "risk_tolerance",
    "question": "How would you describe your risk tolerance?",
    "type": "single",
    "options": ["Very Conservative", "Moderate", "Aggressive", "Very Aggressive"],
    "category": "personality",
    "required": true,
    "order": 5
  }'

# Update a question
curl -X PUT "http://localhost:3000/api/v1/personality/questions/risk_tolerance" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is your risk tolerance level?",
    "active": true
  }'

# Delete a question
curl -X DELETE "http://localhost:3000/api/v1/personality/questions/old_question" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# View private stats as admin
curl -X GET "http://localhost:3000/api/v1/personality/statistics/private/user123?isAdmin=true" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

## 📋 Data Models

### Profile Schema

```typescript
{
  userId: string;              // Required, unique
  username: string;            // Required
  avatar?: string;
  bio?: string;
  region?: string;             // e.g., "Europe/Berlin"

  // Personality Data
  answers: Answer[];
  vectorId: string;
  generatedText?: string;
  personalityText?: string;

  // Test Results
  testResults?: {
    pokerSkillLevel?: number;
    businessAcumen?: number;
    strategicThinking?: number;
    riskTolerance?: number;
    leadership?: number;
  };

  // Preference Weights
  weights?: {
    poker?: number;
    business?: number;
    networking?: number;
    learning?: number;
  };

  // Public Statistics
  rank: number;
  totalWins: number;
  totalGamesPlayed: number;
  tournamentParticipations: number;
  workshopsAttended: string[];
  workshopCompletions: WorkshopCompletion[];
  totalActivityDays: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: Date;

  // Private Statistics
  participatingEvents: string[];
  pastEvents: string[];
  totalHoursPlayed: number;
  matchesFound: number;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}
```

---

### Answer Schema

```typescript
{
  questionKey: string;
  answer: string | string[];
}
```

---

### Workshop Completion Schema

```typescript
{
  workshopId: string;
  completedAt: Date;
  certificateUrl?: string;
}
```

---

## 🌍 Regional Support

Regions use IANA timezone format:
- `Europe/Berlin`
- `America/New_York`
- `Asia/Tokyo`
- `Australia/Sydney`

Matching algorithm gives higher scores to users in the same region, enhancing local networking opportunities.

---

## 🔐 Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

Public endpoints (marked with `@Public()` decorator):
- `GET /questions`
- `GET /questions/:key`
- `GET /statistics/global`
- `GET /statistics/public/:userId`

---

## 📈 Statistics Visibility

### Public Statistics (Visible to All)
- Username, avatar, bio, region
- Rank, wins, games played, win rate
- Tournament participations
- Workshops attended/completed
- Activity days, streaks
- Last active date

### Private Statistics (Owner/Admin Only)
- All public statistics
- Participating/past events
- Total hours played
- Matches found
- Test results
- Preference weights
- Detailed activity days map
- Active status

---

## 🚀 Quick Start Checklist

1. ✅ Get questions: `GET /questions`
2. ✅ Submit answers: `POST /answers`
3. ✅ View your profile: `GET /profile`
4. ✅ Find matches: `GET /match`
5. ✅ Check your stats: `GET /statistics/me`
6. ✅ Explore global stats: `GET /statistics/global`

---

## 💡 Best Practices

1. **Profile Creation:**
   - Always provide region for better matching
   - Fill out test results for more accurate matches
   - Set realistic preference weights

2. **Matching:**
   - Use limit parameter to control API response size
   - Filter by region for local networking
   - Check match scores > 0.8 for high compatibility

3. **Statistics:**
   - Use public endpoints when possible (no auth required)
   - Cache global statistics on frontend (updates every 60s)
   - Show loading skeletons for better UX

4. **Performance:**
   - Paginate match results
   - Lazy load workshop certificates
   - Debounce search/filter inputs

---

## 📞 Support

For questions or issues:
- API Documentation: `http://localhost:3000/api`
- Backend Logs: Check NestJS console
- Frontend Integration: See prompts above

---

**Last Updated:** 2025-01-18
