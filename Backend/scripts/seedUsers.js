// Script tạo sample users để test
const mongoose = require('mongoose');
const UserProfile = require('../src/models/UserProfile');
require('dotenv').config();

const sampleUsers = [
    {
        supabaseId: 'user-001',
        email: 'user1@test.com',
        username: 'testuser1',
        role: 'user',
        status: 'active',
        coins: 100
    },
    {
        supabaseId: 'user-002',
        email: 'user2@test.com',
        username: 'testuser2',
        role: 'user',
        status: 'active',
        coins: 50
    },
    {
        supabaseId: 'user-003',
        email: 'moderator@test.com',
        username: 'moderator1',
        role: 'moderator',
        status: 'active',
        coins: 200
    },
    {
        supabaseId: 'user-004',
        email: 'banned@test.com',
        username: 'banneduser',
        role: 'user',
        status: 'banned',
        banReason: 'Spam',
        bannedAt: new Date(),
        coins: 0
    }
];

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
