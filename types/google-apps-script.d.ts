declare namespace GoogleAppsScript {
  interface ContentService {
    createTextOutput(content: string): TextOutput;
  }

  interface TextOutput {
    setMimeType(mimeType: string): TextOutput;
  }

  interface HtmlService {
    createHtmlOutput(html: string): HtmlOutput;
  }

  interface HtmlOutput {
    setTitle(title: string): HtmlOutput;
    setFaviconUrl(url: string): HtmlOutput;
  }

  interface SpreadsheetApp {
    getActiveSpreadsheet(): Spreadsheet;
  }

  interface Spreadsheet {
    getActiveSheet(): Sheet;
  }

  interface Sheet {
    appendRow(rowContents: any[]): void;
  }

  interface Logger {
    log(message: string): void;
  }

  // Declare the global objects
  const ContentService: ContentService;
  const HtmlService: HtmlService;
  const SpreadsheetApp: SpreadsheetApp;
  const Logger: Logger;
}

// Add the doGet and doPost types
interface DoGetEvent {
  parameter: { [key: string]: string };
  parameters: { [key: string]: string[] };
}

interface DoPostEvent {
  parameter: { [key: string]: string };
  parameters: { [key: string]: string[] };
  postData: {
    contents: string;
    type: string;
    length: number;
  };
}
