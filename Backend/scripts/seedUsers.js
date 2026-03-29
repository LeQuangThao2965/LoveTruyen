// Script tạo sample users để test
const mongoose = require('mongoose');
const UserProfile = require('../src/models/UserProfile');
require('dotenv').config();

async function seedUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Xóa users cũ (trừ admin)
        await UserProfile.deleteMany({ role: { $ne: 'admin' } });
        console.log('Cleared old test users');

        // Tạo users mới
        for (const user of sampleUsers) {
            await UserProfile.findOneAndUpdate(
                { supabaseId: user.supabaseId },
                user,
                { upsert: true, new: true }
            );
            console.log(`Created/Updated user: ${user.username}`);
        }

        console.log('\n✅ Seed completed!');
        console.log('Total users:', await UserProfile.countDocuments());
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

seedUsers();
