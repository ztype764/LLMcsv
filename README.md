# AI-Powered CSV CRM Importer

An intelligent, AI-powered CSV lead importer built for **GrowEasy CRM**. It extracts, cleans, and maps marketing lead details from arbitrary CSV file layouts (Facebook Lead exports, Google Ads sheets, property listings, sales pipelines, etc.) into the structured CRM format using LLM analysis.

---

## Key Features

1. **Intelligent AI Field Mapping**
   - No assumptions about column names or layout structure.
   - Automatically maps name, email, phone number, location, status, notes, data source, and property timelines.
   - Powered by `openai/gpt-oss-120b` on Groq API.
2. **Server-Sent Events (SSE) Streaming API**
   - Processes lead records in batches of 10.
   - Streams mapped batch outcomes back to the frontend in real time, avoiding server timeouts on large files and offering live UI progress.
3. **Advanced Prompt & Guardrail Validation**
   - Restricts CRM status values to: `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, `SALE_DONE`.
   - Maps campaign context or properties into allowed data source options: `leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, `sarjapur_plots`.
   - Concatenates secondary email addresses or mobile numbers into the notes field (`crm_note`).
   - Re-formats dates to be JavaScript `new Date()` parseable.
   - Skips records lacking both an email and a mobile number.
4. **Premium UX & Responsive Layout**
   - Sleek dark theme with glowing gradients and glassmorphism cards.
   - **Drag & Drop** file uploader with validation.
   - Client-side fast **CSV Preview Grid** displaying the first 10 rows before processing.
   - Live **Progress Bar** tracking batches.
   - Post-import **Interactive Result Table** with search filters, statistics cards (success vs skipped count), and sticky table headers.
5. **Docker Containerization**
   - Set up ready for deployment using unified `docker-compose`.

---

## Tech Stack

- **Frontend**: Next.js (App Router, TypeScript, CSS Modules, PapaParse client parser)
- **Backend**: Node.js, Express, TypeScript, Multer (in-memory uploads), CSV-Parse, OpenAI/Groq SDK
- **AI Model**: `openai/gpt-oss-120b` on Groq API

---

## Project Structure

```
CSV-assignment/
├── backend/
│   ├── src/
│   │   ├── server.ts     # Express entry point
│   │   ├── routes.ts     # API routers (file upload & SSE stream)
│   │   ├── ai.ts         # Groq LLM client & Prompt Engineering
│   │   └── parser.ts     # Server CSV parsing using csv-parse
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Main Importer view
│   │   │   ├── layout.tsx        # Title & SEO Metadata
│   │   │   └── globals.css       # Dark theme stylesheet
│   │   └── components/
│   │       ├── DragDropZone.tsx  # File drag & drop zone
│   │       ├── CsvPreviewTable.tsx # 10-row raw table preview
│   │       └── ResultTable.tsx   # Detailed stats & filtered table
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
├── Dockerfile.backend
└── Dockerfile.frontend
```

---

## Getting Started

### 1. Run using Docker Compose (Recommended)

To run both services in containers instantly:

```bash
docker-compose up --build
```

- **Frontend**: Navigate to [http://localhost:3000](http://localhost:3000)
- **Backend**: Running at [http://localhost:5000](http://localhost:5000)

### 2. Run Locally

#### Prerequisites
- Node.js v22+
- NPM

#### Setup Backend
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the `.env` file (copied from the root folder):
   ```
   PORT=5000
   GEN_AI=gsk_La94...
   GROQ_MODEL=openai/gpt-oss-120b
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

#### Setup Frontend
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How to Test

You can test the system using sample spreadsheets. Below is an example of a messy spreadsheet:

```csv
Lead Name,Customer E-Mail,Phone_Num,Date Registered,Project Interest,Status Update,Remarks
John Doe,john.doe@example.com,9876543210,13/05/2026 14:20:48,meridian tower,Good lead,Client reschedules demo
Sarah Johnson,sarah.johnson@example.com,9876543211,13/05/2026 14:25:30,eden park,Did not connect,"Busy, will try next week"
Rajesh Patel,,9876543212,13-05-2026 14:30:15,Sarjapur plots,Bad,Not interested
Invalid Lead,,,13-05-2026 14:31:00,sarjapur_plots,,Missing both contacts
Priya Singh,priya.singh@example.com,9876543213,2026-05-13 14:35:22,eden_park,Sale,Onboarding
```

### Expected Mapping Results:
- **John Doe** & **Sarah Johnson**: Successfully parsed, mapped to corresponding projects, dates normalized.
- **Rajesh Patel**: Mapped successfully even with a missing email (since mobile is present).
- **Invalid Lead**: Skipped entirely (missing email and mobile).
- **Priya Singh**: Mapped, status becomes `SALE_DONE`.

---

## Running Automated Tests

The backend includes a comprehensive suite of unit and integration tests using **Jest** and **Supertest** to verify the core parsing, data sanitization, and API route behaviors.

To run the test suites locally:

1. Open your terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Run the tests:
   ```bash
   npm run test
   ```

### Test Coverage:
- **CSV Parser Unit Tests (`backend/tests/parser.test.ts`)**: Assures correct structure parsing, skipping of empty lines, and header cleanup.
- **AI Cleansing Unit Tests (`backend/tests/ai.test.ts`)**: Validates lead skipping logic, timezone-independent date normalization, allowed statuses, and splitting multiple contact details.
- **Route Integration Tests (`backend/tests/routes.test.ts`)**: Integration checks on `/api/health` and `/api/import` file uploads, simulating real SSE streaming by mocking AI responses.

