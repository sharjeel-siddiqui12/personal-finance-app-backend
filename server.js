import app from './app.js';
import { initialize, closePool } from './config/db.js';
import initializeDatabase from './models/init.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize database connection
initialize()
  .then(async () => {
    // Initialize database sequences and other requirements
    await initializeDatabase();
    
    // Start server
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('Unhandled Rejection:', err);
      // Close server & exit process
      server.close(async () => {
        await closePool();
        process.exit(1);
      });
    });

    // Handle SIGTERM
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Shutting down gracefully');
      server.close(async () => {
        await closePool();
        console.log('Process terminated');
        process.exit(0);
      });
    });
  })
  .catch(err => {
    console.error('Failed to initialize database connection:', err);
    process.exit(1);
  });