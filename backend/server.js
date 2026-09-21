import dotenv from 'dotenv';
dotenv.config(); // loads .env values into Node's environment:

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';

// ES6 module __dirname workaround
// because when using ES Modules, __dirname isn't automatically available
const __filename = fileURLToPath(import.meta.url); //converts the URL into a filesystem path
const __dirname = path.dirname(__filename); //the directory containing this JavaScript file

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Moddlewares to handle CORS
// in Express, app.use() is used to mount middleware functions at a specified path. 
// The middleware function is executed when the base of the requested path matches the specified path. 
/* request
   ↓
middleware A
   ↓
middleware B
   ↓
middleware C
   ↓
route handler
   ↓
response */

// CORS middleware 
// tells the browser what cross-origin requests your server is willing to accept
app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })
);

// JSON middleware
// without it req.body wouldn't be automatically populated with parsed JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folder for uploads
// tells Express to serve static files from the 'uploads' directory when requests are made to the '/uploads' route
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        statusCode: 404
    });
});

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
    console.error(`Error: ${err.message}`);
    console.log('Shutting down the server due to unhandled promise rejection');
    process.exit(1);
});