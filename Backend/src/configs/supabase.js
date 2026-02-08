const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) throw new Error('Thiếu Supabase Key trong .env');

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ Supabase Client Ready!');

module.exports = supabase;