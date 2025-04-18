/**
 * Authentication service for Supabase
 * 
 * This service handles user authentication using Supabase while maintaining
 * compatibility with the existing authentication flow.
 */

const bcrypt = require('bcryptjs');
const supabase = require('../database/supabase');
const db = require('../database/connection');
const { generateToken } = require('../middleware/auth');

/**
 * Register a new user
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} - User data and token
 */
const registerUser = async (username, password) => {
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

  try {
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Insert the user
    const { data, error } = await supabase
      .from('users')
      .insert([{ username, password: hashedPassword }])
      .select();

    if (error) throw error;

    // Create token
    const user = data[0];
    const token = generateToken({ id: user.id, username: user.username });
    
    return { token, username: user.username, id: user.id };
  } catch (error) {
    if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
      throw new Error('Username already exists');
    }
    throw error;
  }
};

/**
 * Login a user
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} - User data and token
 */
const loginUser = async (username, password) => {
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

  try {
    // Get user by username
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new Error('Invalid password');
    }

    // Create token
    const token = generateToken({ id: user.id, username: user.username });
    
    return { token, username: user.username, id: user.id };
  } catch (error) {
    throw error;
  }
};

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Success message
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  if (!currentPassword || !newPassword) {
    throw new Error('Current and new password are required');
  }

  try {
    // Get user by ID
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      throw new Error('Invalid current password');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { message: 'Password updated successfully' };
  } catch (error) {
    throw error;
  }
};

/**
 * Change username
 * @param {string} userId - User ID
 * @param {string} newUsername - New username
 * @param {string} password - Current password
 * @returns {Promise<Object>} - User data and new token
 */
const changeUsername = async (userId, newUsername, password) => {
  if (!newUsername || !password) {
    throw new Error('New username and password are required');
  }

  try {
    // Get user by ID
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    // Verify current password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new Error('Invalid password');
    }

    // Check if new username is available
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', newUsername)
      .neq('id', userId)
      .single();

    if (existingUser) {
      throw new Error('Username already taken');
    }

    // Update username
    const { error: updateError } = await supabase
      .from('users')
      .update({ username: newUsername })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Generate new token with updated username
    const token = generateToken({ id: userId, username: newUsername });
    
    return { token, username: newUsername };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  registerUser,
  loginUser,
  changePassword,
  changeUsername
};
