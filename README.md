# Election Voter Registration Checker

This project automates the process of checking political party registration status for a large number of users by querying the Maldives election voter registration database.

## ⚠️ IMPORTANT DISCLAIMER

**THIS PROJECT IS FOR DEMONSTRATION AND EDUCATIONAL PURPOSES ONLY.**

This software is provided strictly as a technology demonstration project to showcase web automation capabilities. It is **NOT intended for production use, commercial use, or any real-world applications**.

### Legal Disclaimer

**BY USING THIS SOFTWARE, YOU ACKNOWLEDGE AND AGREE THAT:**

1. This software is provided "AS IS" without warranty of any kind, express or implied.
2. The author(s) and contributor(s) assume **NO RESPONSIBILITY OR LIABILITY** for any consequences arising from the use of this software.
3. Users are **SOLELY RESPONSIBLE** for ensuring their use complies with all applicable laws, regulations, and terms of service.
4. This software may interact with third-party services. Users must comply with all terms of service and acceptable use policies of those services.
5. Automated querying may violate terms of service, result in rate limiting, IP blocking, or legal consequences.
6. The author(s) are **NOT LIABLE** for any legal issues, damages, data loss, service interruptions, or other problems that may arise from using this software.
7. This software should **NOT be used** for any purpose that violates local, national, or international laws.
8. Users must obtain proper authorization before using this software to access any third-party systems or data.

**USE AT YOUR OWN RISK.**

---

## Prerequisites

- **Node.js** (v14 or higher)
- **npm** (Node Package Manager)
- Internet connection

---

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd Election
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` to adjust configuration as needed:

```env
DATA_FILE_PATH=./data/data.csv
DELAY_BETWEEN_PEOPLE=15
MAX_RETRIES_PER_PERSON=1
RATE_LIMIT_WAIT_1ST=2
RATE_LIMIT_WAIT_2ND=5
RATE_LIMIT_WAIT_3RD=10
```

### 4. Prepare your data file

Create a `data` folder if it doesn't exist:

```bash
mkdir -p data
```

Create a CSV file at `data/data.csv` with the following headers:

```csv
#,Name,NID,Party,Reg. Date,Status,Retry
```

**Example:**

```csv
#,Name,NID,Party,Reg. Date,Status,Retry
1,Mariyam Ibrahim,A089393,,,
2,Mohamed Faariz,A260000,,,
3,Aminath Fazeema,A260002,,,
```

**Required columns:**
- `#` - Row number
- `Name` - Full name (first word will be used as first name)
- `NID` - National ID number
- `Party` - (Leave empty, will be filled by script)
- `Reg. Date` - (Leave empty, will be filled by script)
- `Status` - (Leave empty, will be filled by script)
- `Retry` - (Leave empty, will be filled by script)

---

## Usage

Run the script:

```bash
node runner.js
```

### How it works

1. Reads people from `data/data.csv`
2. For each person:
   - Extracts first name from full name
   - Opens browser and navigates to the voter registration site
   - Fills in NID and first name
   - Waits for CAPTCHA to be solved
   - Submits and retrieves results
   - Updates CSV with party affiliation and registration date
3. Skips already processed entries (`found` or `notfound` status)
4. Retries entries with `timeout` status
5. Waits 15 seconds between each person
6. Handles rate limiting with escalating wait times (2min → 5min → 10min)

### Status values

- `found` - Person found in registry
- `notfound` - Person not found in registry
- `timeout` - Rate limited or failed after retries

### Resume capability

The script automatically saves progress after each person. If interrupted, simply run it again - it will skip completed entries and continue from where it left off.

---

## Configuration

Edit `.env` to customize behavior:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATA_FILE_PATH` | Path to CSV file | `./data/data.csv` |
| `DELAY_BETWEEN_PEOPLE` | Seconds between each person | `15` |
| `MAX_RETRIES_PER_PERSON` | Max retries per person | `1` |
| `RATE_LIMIT_WAIT_1ST` | 1st rate limit wait (minutes) | `2` |
| `RATE_LIMIT_WAIT_2ND` | 2nd rate limit wait (minutes) | `5` |
| `RATE_LIMIT_WAIT_3RD` | 3rd+ rate limit wait (minutes) | `10` |

---

## Important Notes

- **Runtime**: For 2000 people at 15 seconds each, expect ~8-10 hours
- **Rate Limiting**: Aggressive querying will trigger rate limits
- **CAPTCHA**: Browser opens in non-headless mode for CAPTCHA solving
- **Browser Focus**: Browser window may take focus when opening
- **Interruption**: Safe to stop and resume - progress is saved after each person

---

## Troubleshooting

**"TIMEOUT - No result returned"**
- Page may need more time to load
- Check debug output for page content
- Increase wait times in script

**Rate limited frequently**
- Increase `DELAY_BETWEEN_PEOPLE`
- Increase `RATE_LIMIT_WAIT_*` values
- Reduce query volume

**Browser won't open**
- Ensure Chrome/Chromium is installed
- Check puppeteer-real-browser installation

---

## License

This project is provided for educational and demonstration purposes only. See disclaimer above.

**NO WARRANTY. USE AT YOUR OWN RISK. AUTHOR NOT RESPONSIBLE FOR ANY LEGAL OR OTHER ISSUES ARISING FROM USE.**

---

## Contributing

This is a demonstration project. Contributions are not actively sought, but suggestions are welcome for educational purposes.
