import Transaction from "../models/transaction.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";
import PDFDocument from "pdfkit";
import { createObjectCsvWriter } from "csv-writer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import moment from "moment";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get monthly report
const getMonthlyReport = asyncHandler(async (req, res, next) => {
  const { month, year } = req.query;

  if (!month || !year) {
    return next(new AppError("Month and year are required", 400));
  }

  // Ensure month is properly padded
  const paddedMonth = String(month).padStart(2, "0");
  
  // Format dates for first and last day of month
  const startDate = `${year}-${paddedMonth}-01`;
  const endDate = moment(`${year}-${paddedMonth}-01`)
    .endOf("month")
    .format("YYYY-MM-DD");

  console.log(`Generating report from ${startDate} to ${endDate}`);

  // Get transactions for the month
  const transactions = await Transaction.getTransactionsByDateRange(
    req.user.id,
    startDate,
    endDate
  );

  // Calculate summary metrics
  const summary = {
    totalIncome: 0,
    totalExpense: 0,
    netSavings: 0,
  };

  // Group by category for pie chart
  const expensesByCategory = [];

  // Group by day/week for time series
  const incomeVsExpense = [];

  // Category totals map
  const categoryTotals = {};

  // Date totals map
  const dateTotals = {};

  transactions.forEach((transaction) => {
    // Access properties in a case-insensitive way
    const type = transaction.TYPE || transaction.type;
    const amount = parseFloat(transaction.AMOUNT || transaction.amount);
    const categoryName = transaction.CATEGORY_NAME || transaction.category_name;
    const dateStr = transaction.TRANSACTION_DATE || transaction.transaction_date;

    if (type === "INCOME" || type === "Income") {
      summary.totalIncome += amount;
    } else {
      summary.totalExpense += amount;

      // Track category expenses
      if (!categoryTotals[categoryName]) {
        categoryTotals[categoryName] = 0;
      }
      categoryTotals[categoryName] += amount;
    }

    // Group by date for chart
    if (!dateTotals[dateStr]) {
      dateTotals[dateStr] = {
        date: dateStr,
        income: 0,
        expense: 0,
      };
    }

    if (type === "INCOME" || type === "Income") {
      dateTotals[dateStr].income += amount;
    } else {
      dateTotals[dateStr].expense += amount;
    }
  });

  // Calculate net savings
  summary.netSavings = summary.totalIncome - summary.totalExpense;

  // Format expenses by category for chart
  Object.keys(categoryTotals).forEach((category) => {
    expensesByCategory.push({
      category,
      amount: categoryTotals[category],
    });
  });

  // Sort by amount descending
  expensesByCategory.sort((a, b) => b.amount - a.amount);

  // Convert date totals to array and sort by date
  Object.values(dateTotals).forEach((item) => {
    incomeVsExpense.push(item);
  });

  // Sort income vs expense by date
  incomeVsExpense.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Get monthly trend data
  const monthlyTrend = await Transaction.getFinancialTrends(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      summary,
      transactions,
      expensesByCategory,
      incomeVsExpense,
      monthlyTrend,
      period: {
        startDate,
        endDate,
      },
    },
  });
});

// Get report by date range
// Updated to use same case-insensitive approach as monthly
const getReportByDateRange = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return next(new AppError("Start and end dates are required", 400));
  }

  console.log(`Generating custom report from ${startDate} to ${endDate}`);

  // Get transactions for the date range
  const transactions = await Transaction.getTransactionsByDateRange(
    req.user.id,
    startDate,
    endDate
  );

  console.log(`Found ${transactions.length} transactions for date range report`);

  // Calculate summary metrics
  const summary = {
    totalIncome: 0,
    totalExpense: 0,
    netSavings: 0,
  };

  // Group by category for pie chart
  const expensesByCategory = [];

  // Group by day/week for time series
  const incomeVsExpense = [];

  // Category totals map
  const categoryTotals = {};

  // Date totals map
  const dateTotals = {};

  transactions.forEach((transaction) => {
    // Access properties in a case-insensitive way
    const type = transaction.TYPE || transaction.type;
    const amount = parseFloat(transaction.AMOUNT || transaction.amount);
    const categoryName = transaction.CATEGORY_NAME || transaction.category_name;
    const dateStr = transaction.TRANSACTION_DATE || transaction.transaction_date;

    if (type === "INCOME" || type === "Income") {
      summary.totalIncome += amount;
    } else {
      summary.totalExpense += amount;

      // Track category expenses
      if (!categoryTotals[categoryName]) {
        categoryTotals[categoryName] = 0;
      }
      categoryTotals[categoryName] += amount;
    }

    // Group by date for chart
    if (!dateTotals[dateStr]) {
      dateTotals[dateStr] = {
        date: dateStr,
        income: 0,
        expense: 0,
      };
    }

    if (type === "INCOME" || type === "Income") {
      dateTotals[dateStr].income += amount;
    } else {
      dateTotals[dateStr].expense += amount;
    }
  });

  // Calculate net savings
  summary.netSavings = summary.totalIncome - summary.totalExpense;

  // Format expenses by category for chart
  Object.keys(categoryTotals).forEach((category) => {
    expensesByCategory.push({
      category,
      amount: categoryTotals[category],
    });
  });

  // Sort by amount descending
  expensesByCategory.sort((a, b) => b.amount - a.amount);

  // Convert date totals to array and sort by date
  Object.values(dateTotals).forEach((item) => {
    incomeVsExpense.push(item);
  });

  incomeVsExpense.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Get monthly trend data
  const monthlyTrend = await Transaction.getFinancialTrends(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      summary,
      transactions,
      expensesByCategory,
      incomeVsExpense,
      monthlyTrend,
      period: {
        startDate,
        endDate,
      },
    },
  });
});

// Download report as PDF
// Fixed to handle case sensitivity and empty results
const downloadReportPdf = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return next(new AppError("Start and end dates are required", 400));
  }
  
  // Add this debugging to see what's happening
  console.log(`Generating PDF report for user ${req.user.id} from ${startDate} to ${endDate}`);
  
  // Get transactions for the date range
  const transactions = await Transaction.getTransactionsByDateRange(
    req.user.id,
    startDate,
    endDate
  );
  
  // Debug the transaction count
  console.log(`Found ${transactions.length} transactions for PDF report`);
  
  // Create temporary file path
  const tempFilePath = path.join(__dirname, "../tmp", `report_${Date.now()}.pdf`);
  
  // Ensure tmp directory exists
  if (!fs.existsSync(path.join(__dirname, "../tmp"))) {
    fs.mkdirSync(path.join(__dirname, "../tmp"), { recursive: true });
  }
  
  // Create PDF document
  const doc = new PDFDocument();
  const stream = fs.createWriteStream(tempFilePath);
  
  doc.pipe(stream);
  
  // Document title
  doc.fontSize(20).text("Financial Report", { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text(`Period: ${startDate} to ${endDate}`, { align: "center" });
  doc.moveDown();
  
  // Calculate summary metrics
  let totalIncome = 0;
  let totalExpense = 0;
  
  transactions.forEach((transaction) => {
    // Access properties in a case-insensitive way
    const type = transaction.TYPE || transaction.type;
    const amount = parseFloat(transaction.AMOUNT || transaction.amount);
    
    if (type === "INCOME" || type === "Income") {
      totalIncome += amount;
    } else {
      totalExpense += amount;
    }
  });
  
  const netSavings = totalIncome - totalExpense;
  
  // Summary section
  doc.fontSize(16).text("Summary", { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Total Income: Rs. ${totalIncome.toFixed(2)}`);
  doc.fontSize(12).text(`Total Expenses: Rs. ${totalExpense.toFixed(2)}`);
  doc.fontSize(12).text(`Net Savings: Rs. ${netSavings.toFixed(2)}`);
  doc.moveDown(2);
  
  // Transactions section
  doc.fontSize(16).text("Transactions", { underline: true });
  doc.moveDown();
  
  // Handle empty transactions
  if (transactions.length === 0) {
    doc.fontSize(12).text("No transactions found for the selected period.", {
      italic: true,
      align: "center",
    });
  } else {
    // Table header
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidths = [80, 150, 120, 100, 100]; // Date, Description, Category, Type, Amount
    
    // Header row
    doc.fontSize(10)
      .text("Date", tableLeft, tableTop)
      .text("Description", tableLeft + colWidths[0], tableTop)
      .text("Category", tableLeft + colWidths[0] + colWidths[1], tableTop)
      .text("Type", tableLeft + colWidths[0] + colWidths[1] + colWidths[2], tableTop)
      .text("Amount", tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], tableTop);
    
    doc.moveDown();
    
    // Draw horizontal line
    doc.moveTo(tableLeft, doc.y)
      .lineTo(tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], doc.y)
      .stroke();
    
    doc.moveDown(0.5);
    
    // Transaction rows
    transactions.forEach((transaction, index) => {
      const rowY = doc.y;
      
      // Add new page if near the end
      if (rowY > 700) {
        doc.addPage();
        doc.y = 50;
      }
      
      // Get transaction properties with case-insensitive handling
      const date = transaction.TRANSACTION_DATE || transaction.transaction_date;
      const description = transaction.DESCRIPTION || transaction.description;
      const category = transaction.CATEGORY_NAME || transaction.category_name || "Uncategorized";
      const type = transaction.TYPE || transaction.type;
      const amount = parseFloat(transaction.AMOUNT || transaction.amount);
      
      doc.fontSize(9)
        .text(date, tableLeft, doc.y)
        .text(description, tableLeft + colWidths[0], doc.y, {
          width: colWidths[1] - 10,
        })
        .text(category, tableLeft + colWidths[0] + colWidths[1], doc.y)
        .text(type, tableLeft + colWidths[0] + colWidths[1] + colWidths[2], doc.y)
        .text(`Rs. ${amount.toFixed(2)}`, tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], doc.y);
      
      doc.moveDown();
      
      // Add subtle row divider
      if (index < transactions.length - 1) {
        doc.moveTo(tableLeft, doc.y - 2)
          .lineTo(tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], doc.y - 2)
          .opacity(0.2)
          .stroke()
          .opacity(1);
      }
    });
  }
  
  // Finalize PDF
  doc.end();
  
  // Wait for stream to finish
  stream.on("finish", function () {
    // Send the PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=financial_report_${startDate}_to_${endDate}.pdf`);
    
    const fileStream = fs.createReadStream(tempFilePath);
    fileStream.pipe(res);
    
    // Delete the temporary file after sending
    fileStream.on("end", function () {
      fs.unlinkSync(tempFilePath);
    });
  });
});

// Download report as CSV
// Fixed to handle case sensitivity and empty results
// Update just the downloadReportCsv function with this fixed version

const downloadReportCsv = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return next(new AppError("Start and end dates are required", 400));
  }
  
  console.log(`Generating CSV report for user ${req.user.id} from ${startDate} to ${endDate}`);
  
  // Get transactions for the date range
  const transactions = await Transaction.getTransactionsByDateRange(
    req.user.id,
    startDate,
    endDate
  );
  
  console.log(`Found ${transactions.length} transactions for CSV report`);
  
  // Create temporary file path
  const tempFilePath = path.join(__dirname, "../tmp", `report_${Date.now()}.csv`);
  
  // Ensure tmp directory exists
  if (!fs.existsSync(path.join(__dirname, "../tmp"))) {
    fs.mkdirSync(path.join(__dirname, "../tmp"), { recursive: true });
  }
  
  // Create CSV writer
  const csvWriter = createObjectCsvWriter({
    path: tempFilePath,
    header: [
      { id: "date", title: "Date" },
      { id: "description", title: "Description" },
      { id: "category", title: "Category" },
      { id: "type", title: "Type" },
      { id: "amount", title: "Amount" },
    ],
  });
  
  // For empty results, write a header row only with a message
  if (!transactions || transactions.length === 0) {
    await csvWriter.writeRecords([{ 
      date: startDate, 
      description: "No transactions found for this period",
      category: "",
      type: "",
      amount: ""
    }]);
  } else {
    // Format the data with better date handling
    const records = transactions.map((transaction) => {
      // Debug log to see what we're working with
      console.log(`Transaction date fields:`, {
        TRANSACTION_DATE: transaction.TRANSACTION_DATE,
        transaction_date: transaction.transaction_date,
      });
      
      // Try to extract the date from any available field
      let transactionDate = null;
      
      // Check all possible date field variations
      if (transaction.TRANSACTION_DATE) {
        transactionDate = transaction.TRANSACTION_DATE;
      } else if (transaction.transaction_date) {
        transactionDate = transaction.transaction_date;
      } else {
        // Look through all properties for date-like fields
        for (const key in transaction) {
          if (key.toLowerCase().includes('date')) {
            transactionDate = transaction[key];
            break;
          }
        }
      }
      
      // Ensure date is formatted as YYYY-MM-DD
      if (transactionDate) {
        // If it's already a string in desired format, keep it
        if (typeof transactionDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(transactionDate)) {
          // Already in YYYY-MM-DD format, keep as is
        } 
        // If it's a Date object, format it
        else if (transactionDate instanceof Date) {
          transactionDate = transactionDate.toISOString().split('T')[0];
        } 
        // If it's in another string format, try to parse and reformat
        else if (typeof transactionDate === 'string') {
          try {
            const date = new Date(transactionDate);
            if (!isNaN(date.getTime())) {
              transactionDate = date.toISOString().split('T')[0];
            }
          } catch (e) {
            console.error(`Error formatting date: ${transactionDate}`);
          }
        }
      } else {
        // Fallback if no date found
        transactionDate = "Date not available";
      }
      
      return {
        date: transactionDate,
        description: transaction.DESCRIPTION || transaction.description || "",
        category: transaction.CATEGORY_NAME || transaction.category_name || "Uncategorized",
        type: transaction.TYPE || transaction.type || "",
        amount: `Rs. ${parseFloat(transaction.AMOUNT || transaction.amount || 0).toFixed(2)}`,
      };
    });
    
    // Write to CSV
    await csvWriter.writeRecords(records);
  }
  
  // Send the CSV
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=financial_report_${startDate}_to_${endDate}.csv`);
  
  const fileStream = fs.createReadStream(tempFilePath);
  fileStream.pipe(res);
  
  // Delete the temporary file after sending
  fileStream.on("end", function () {
    fs.unlinkSync(tempFilePath);
  });
});

export {
  getMonthlyReport,
  getReportByDateRange,
  downloadReportPdf,
  downloadReportCsv,
};