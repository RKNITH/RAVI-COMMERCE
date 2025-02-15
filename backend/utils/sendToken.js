import jwt from 'jsonwebtoken';

const sendToken = (user, statusCode, res) => {
    // Create JWT Token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_TIME, // e.g., '1d'
    });

    // Options for cookie
    const options = {
        expires: new Date(
            Date.now() + process.env.COOKIE_EXPIRES_TIME * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Secure only in production
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax', // Adjust for production
    };

    // Send the response with the cookie
    res.status(statusCode)
        .cookie("token", token, options)
        .json({
            success: true,
            token,
            user, // Optionally include user data
        });
};

export default sendToken;
