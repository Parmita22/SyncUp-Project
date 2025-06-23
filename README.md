
# SyncUP

SyncUp is a comprehensive task management system where all tasks, from backlog ,todo , review are there providing complete visibility and enhances productivity of team. implementing a clear prioritization framework based on objectives and deadlines to ensure focus on most of the critical tasks task management system enable better allocation of recourses by providing insights pf workload distribution better decision making it provides transparency that what task is in status what is in running can analyze task progress , identify bottlenecks.


## Tech Stack

**UI Frameworks:** next.js, MUI, TailwindCSS

**Database:** PostgreSQL

**AUTH:** NextAuth

**State management:** Redux flux/Redux saga

**API Communication:** Prisma

**Integrations**: Slack API

**Deployment:** Vercel


## Getting started

### 1. Clone this Repository

Clone this repository using:

```
git clone https://github.com/positsource/SyncUP.git
```

### 2. Download and install dependencies

Install all npm dependencies:

```
npm i
```

### 3. Prisma Installation

Install prisma:

```
🔗 https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
```

### 4. Prisma Setup

Initial Prisma Setup Guide:

```
npx prisma generate
npx prisma init
npx prisma db push
npx prisma studio
```

### 5 . Prisma Pulse Setup

1 . Enable Pulse in the Platform Console

  -  Choose the environment you want to enable Pulse for
  -  Enable Pulse:
      In the project environment of your choice, click the Enable Pulse button. 
  -  Configure Pulse:
       - Your Database connection string

       - Region where Pulse should be hosted
       
       - Enable Static IP (if your database uses IP allowlisting)

       - Ensure Event persistence is enabled for delivery guarantees with .stream() and .subscribe() 
  -  Generate an API Key
        - Store the key securely or add it to your .env file:
          ```bash
          PULSE_API_KEY=your-api-key
          ```   

2 .  Add Pulse to Your Application

  -  Install the Pulse Client extension:
     ```bash
     npm install @prisma/extension-pulse@latest
     ```
  -  Also install the latest Prisma Client and extension:
      ```bash
      npm install prisma @prisma/client@latest @prisma/extension-pulse@latest
      ```

  -  Extend your Prisma Client instance with the Pulse extension. 

  -  Create your first Pulse stream using .stream() or .subscribe()


### 6 . Slack Integration Setup

SyncUp integrates with Slack to enable task management via slash commands and shortcuts. Follow these steps to configure the Slack app:

1 . Set Up ngrok for Local Development

  - Download ngrok:[ ngrok Windows Download](https://ngrok.com/downloads/windows?tab=download).
  - Sign in to [ngrok.com](https://ngrok.com/), navigate to Your Authtoken, and copy the authtoken.
  - Open a terminal, authenticate ngrok:

      ```bash
       ngrok authtoken <your-authtoken> 
       ```
  - Expose your local server (running on port 3000) to the internet

      ```bash 
      ngrok http 3000
      ```
   - Copy the generated ngrok URL (e.g., https://<ngrok-id>.ngrok-free.app).
      
2 . Create a Slack App

  - Visit [Slack API](https://api.slack.com/) and sign in.
  - Create a workspace with the same name as your organization.
  - Go to Your Apps and select Create New App > From Scratch.
  - Choose the created workspace and name the app (e.g., SyncUp).

3 . Configure Slack App Credentials

   - Navigate to Basic Information and copy the Client ID, Client Secret, and Signing Secret.
   - Add these to .env file
        ```bash
        SLACK_CLIENT_ID=<your-client-id>
        SLACK_CLIENT_SECRET=<your-client-secret>
        SLACK_SIGNING_SECRET=<your-signing-secret>
        NEXT_PUBLIC_SLACK_CLIENT_ID=${SLACK_CLIENT_ID}
      
4 . Generate App-Level Token

  - In Basic Information, generate an App-Level Token.
  - Set the token name (e.g., SyncUpToken) and add scopes: connections:write, authorization:read.
  - Copy the token and add it to your .env file:
      ```bash
      SLACK_APP_TOKEN=<your-app-level-token>
      
5 . Configure OAuth & Permissions

  - Go to OAuth & Permissions, add the ngrok URL with the callback path to Redirect URLs, then copy the same URL and set it as the value for the SLACK_REDIRECT_URL variable in your .env file.
      ```bash
      <ngrok-url>/api/slack/callback     
  - Add the following scopes:
       ```
      channels:history, channels:join, channels:read, channels:manage, channels:write.topic,chat:write, commands, groups:history, groups:read, groups:write, groups:write.topic,im:history,im:read, im:write, im:write.topic, incoming-webhook, mpim:history, mpim:read,mpim:write, mpim:write.topic, users:read, users:read.email.
  - Install the app to your workspace and copy the Bot User OAuth Token. Add it to your .env file: 
       ```bash
       SLACK_BOT_TOKEN=<your-bot-token>

6 . Set Up Slash Commands
  - [Go to Slash Commands and create a new command](https://api.slack.com/interactivity/slash-commands)
   
7 . Enable Interactivity & Shortcuts
  -  [Go to Interactivity & Shortcuts and enable interactivity and shortcuts.](https://api.slack.com/interactivity/shortcuts)

     

### 7. Environment Variables

Set up a `.env` file at the root of the project with the necessary environment variables listed in `.env.sample` file.

### 8. Run the App

Run this App using:
```bash 
cd app
npm install   # only if not already installed
npm run dev
```

The app is now running, navigate to http://localhost:3000/ in your browser to explore its UI.

