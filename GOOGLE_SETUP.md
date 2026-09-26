# Google tools setup

FrictionOS uses Google OAuth on the server. Refresh tokens stay in an HTTP-only cookie; the short-lived access token is handed to Google Picker in memory so you can select one spreadsheet. The consent screen requests only the services selected in **Tools**.

## Configure Google OAuth

1. In Google Cloud Console, create a project, enable the Google Sheets API and Google Picker API, and configure the OAuth consent screen. If the app is in Testing mode, add your Google account as a test user.
2. Create an OAuth client ID for a **Web application**. Add this authorized redirect URI:

   `http://localhost:3000/api/google/callback`

3. Add the client values, a browser API key restricted to Google Picker, and the Cloud project number to `.env.local` (copy `.env.example` first):

   ```dotenv
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
   NEXT_PUBLIC_GOOGLE_API_KEY=...
   NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER=...
   ```

4. Restart the development server. Open **Dashboard → Tools**, select Google Sheets, then choose **Connect selected services** and complete Google's consent flow.
5. Choose **Google Sheets** in Tools, connect it, then click **Choose Google Sheet** and select the shipment spreadsheet in Google Picker. The first tab should have column headers in row 1; its rows are read as shipment evidence when a Google Sheets capability is assigned to an agent.
6. Create an agent, select the Google Sheets capabilities it needs, then create a task for that agent. The task reads up to 500 rows from the configured sheet and sends those rows to the configured OpenAI model for analysis.

The Sheets connection uses Google's per-file `drive.file` permission and Picker so the app receives access only to the spreadsheet you choose. The provider can also request Docs, Drive, Gmail, and Calendar permissions individually. FrictionOS currently executes Google Sheets reads in task investigations; Gmail and Calendar actions are capability choices for the next integration step.
