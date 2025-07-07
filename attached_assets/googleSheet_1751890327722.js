import { google } from 'googleapis';

/**
 * Fetches data from the specified Google Sheet.
 * @returns {Promise<Array<{profileUrl: string, message: string}>>} A promise that resolves to an array of objects.
 */
async function getSheetData(config, logCallback) {
  try {
    const sheets = google.sheets({
      version: 'v4',
      auth: config.google.apiKey,
    });

    const range = `${config.google.sheetName}!A${config.google.startRow}:B${config.google.endRow}`;

    console.log(`Fetching data from sheet '${config.google.sheetName}' in range ${range}...`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.google.sheetId,
      range: range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('No data found in the specified range.');
      return [];
    }

    // Map rows to a more usable format, filtering out any empty rows
    const data = rows
        .map((row, idx) => ({
            profileUrl: row[0],
            message: row[1],
            rowNumber: config.google.startRow + idx // Add row number for each profile
        }))
        .filter(item => item.profileUrl && item.message);
    
    console.log(`Successfully fetched ${data.length} profiles to process.`);
    return data;

  } catch (err) {
    if (logCallback) logCallback('Error fetching data from Google Sheets: ' + err.message);
    throw err;
  }
}

// Helper to write status to column C
async function writeStatusToSheet(config, rowNumber, status, logCallback) {
    // Skip writing if API key is invalid (contains space or special characters)
    if (!config.google.apiKey || config.google.apiKey.includes(' ') || config.google.apiKey.includes('#')) {
        return; // Silently skip to avoid repeated error messages
    }
    
    try {
        const sheets = google.sheets({
            version: 'v4',
            auth: config.google.apiKey,
        });
        const range = `${config.google.sheetName}!C${rowNumber}`;
        await sheets.spreadsheets.values.update({
            spreadsheetId: config.google.sheetId,
            range: range,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[status]],
            },
        });
        if (logCallback) logCallback(`Wrote status to row ${rowNumber}: ${status}`);
    } catch (err) {
        if (logCallback) logCallback('Error writing status to Google Sheets: ' + err.message);
    }
}

export { getSheetData, writeStatusToSheet };