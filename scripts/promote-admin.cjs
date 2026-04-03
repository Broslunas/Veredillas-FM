require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error("MONGODB_URI not found in environment. Make sure .env exists and is readable.");
    process.exit(1);
}

async function promote() {
    try {
        await mongoose.connect(uri);
        console.log("Connected to MongoDB");
        
        const email = 'pablo.luna.perez.008@gmail.com';
        
        // Mongoose automatically looks for the pluralized collection name 'users'
        // If your User model name was 'User', collection defaults to 'users'
        const db = mongoose.connection.db;
        const collection = db.collection('users');
        
        const result = await collection.updateOne(
            { email: email },
            { $set: { role: 'admin' } }
        );
        
        if (result.matchedCount === 0) {
            console.log(`User ${email} NOT FOUND in database.`);
            console.log("Please ensure you have logged in at least once with this email.");
        } else if (result.modifiedCount === 0) {
             console.log(`User ${email} found, but was already admin or no change needed.`);
        } else {
            console.log(`User ${email} successfully promoted to ADMIN.`);
        }
        
    } catch(e) {
        console.error("Error promoting user:", e);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected");
    }
}

promote();
