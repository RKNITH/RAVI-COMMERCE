
import User from '../models/user.model.js'
import bcrypt from 'bcryptjs'
import validator from 'validator'
import ErrorHandler from '../utils/errorHandler.js'
import sendToken from '../utils/sendToken.js'
import catchAsyncErrors from '../middlewares/catchAsyncErrors.js'
import { upload_file, delete_file } from '../utils/cloudinary.js'
import { getResetPasswordTemplate } from '../utils/emailTemplate.js'
import crypto from "crypto";

// register user
const registerUser = catchAsyncErrors(async (req, res, next) => {
    try {
        //  getting user data from input fields
        const { name, email, password } = req.body
        if (!name || !email || !password) {
            return next(new ErrorHandler("Please enter all the fields", 400));
        }

        //  validate email
        if (!validator.isEmail(email)) {
            return next(new ErrorHandler("Please enter valid email", 400));
        }

        //  check password strength
        if (password.length < 6) {
            return next(new ErrorHandler("Password must be atleast 6 digits long", 400));
        }

        //  check user already exist or not
        const exist = await User.findOne({ email })
        if (exist) {
            return next(new ErrorHandler("user already exists", 400));
        }

        // hash password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        //  create new user
        const newUser = new User({
            name,
            email,
            password: hashedPassword
        })

        //  save user to database
        await newUser.save()

        //  send token
        sendToken(newUser, 201, res)

    } catch (error) {
        next(error)

    }
})


//  login user
const loginUser = catchAsyncErrors(async (req, res, next) => {

    try {

        //  get user details from inout fields
        const { email, password } = req.body
        if (!email || !password) {
            return next(new ErrorHandler("Please enter email and password", 400))
        }

        // validate email
        if (!validator.isEmail(email)) {
            return next(new ErrorHandler("Please enter valid email", 400))
        }

        // check user exist or not

        const user = await User.findOne({ email }).select("+password")

        if (!user) {
            return next(new ErrorHandler("User does not exist", 400))
        }

        //  matching password
        const match = await bcrypt.compare(password, user.password)

        if (!match) {
            return next(new ErrorHandler("Please enter correct password", 400))
        }

        sendToken(user, 201, res)

    } catch (error) {
        next(error)

    }


})



//  logout user
const logout = catchAsyncErrors(async (req, res, next) => {

    try {
        // Clear the token cookie
        res.cookie("token", null, {
            expires: new Date(Date.now()),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        });

        // Send success response
        res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });
    } catch (error) {
        next(error); // Pass error to the error handling middleware
    }


})



// upload Avatar
const uploadAvatar = catchAsyncErrors(async (req, res, next) => {
    try {

        const avatarResponse = await upload_file(req.body.avatar, 'avatars');

        // Remove previous avatar if exists
        if (req?.user?.avatar?.url) {
            console.log('Deleting previous avatar...');
            await delete_file(req?.user?.avatar?.public_id);
        }

        const user = await User.findByIdAndUpdate(req?.user?._id, {
            avatar: avatarResponse,
        });

        res.status(200).json({
            user,
        });
    } catch (error) {
        console.error('Error uploading avatar:', error);
        next(error);
    }


})



// forgot password
const forgotPassword = catchAsyncErrors(async (req, res, next) => {
    // Find user in the database
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return next(new ErrorHandler("User not found with this email", 404));
    }

    // Get reset password token
    const resetToken = user.getResetPasswordToken();

    // Save user with the reset token
    await user.save({ validateBeforeSave: false });

    // Create reset password URL
    const resetUrl = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;

    // Generate email content
    const message = getResetPasswordTemplate(user?.name, resetUrl);

    try {
        // Send email
        await sendEmail({
            email: user.email,
            subject: "Password Recovery",
            message,
        });

        res.status(200).json({
            success: true,
            message: `Email sent to: ${user.email}`,
        });
    } catch (error) {
        // Revert reset token if email sending fails
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave: false });
        return next(new ErrorHandler("Email could not be sent", 500));
    }

})




// reset password
const resetPassword = catchAsyncErrors(async (req, res, next) => {
    // Hash the URL token
    const resetPasswordToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");

    // Find user with the token and check if it is not expired
    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
        return next(
            new ErrorHandler("Password reset token is invalid or has expired", 400)
        );
    }

    // Check if passwords match
    if (req.body.password !== req.body.confirmPassword) {
        return next(new ErrorHandler("Passwords do not match", 400));
    }

    // Set the new password
    user.password = req.body.password;

    // Remove reset token and expiry
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    // Save the updated user
    await user.save();

    // Send JWT token
    sendToken(user, 200, res);

})




// get user profile

const getUserProfile = catchAsyncErrors(async (req, res, next) => {
    try {
        const user = await User.findById(req?.user?._id);
        res.status(200).json({
            user,
        });
    } catch (error) {
        next(error);

    }

})





// update password
const updatePassword = catchAsyncErrors(async (req, res, next) => {
    try {
        const user = await User.findById(req?.user?._id).select("+password");

        // Check previous user password
        const isMatch = await bcrypt.compare(req.body.oldPassword, user.password);
        if (!isMatch) {
            return next(new ErrorHandler("Old password is incorrect", 400));
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);

        await user.save();

        sendToken(user, 200, res);
    } catch (error) {
        next(error);

    }

})




// update profile
const updateProfile = catchAsyncErrors(async (req, res, next) => {
    try {
        const newUserData = {
            name: req.body.name,
            email: req.body.email,
        };

        const user = await User.findByIdAndUpdate(req?.user?._id, newUserData, {
            new: true,

        });

        res.status(200).json({
            user,
        });
    } catch (error) {
        next(error);

    }

})





// all users
const allUsers = catchAsyncErrors(async (req, res, next) => {
    try {
        const users = await User.find();
        res.status(200).json({
            users,
        });
    } catch (error) {
        next(error);

    }

})







// get uset details
const getUserDetails = catchAsyncErrors(async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return next(new ErrorHandler(`User does not exist with id: ${req.params.id}`, 404));
        }

        res.status(200).json({
            user,
        });
    } catch (error) {
        next(error);

    }

})






// update user
const updateUser = catchAsyncErrors(async (req, res, next) => {
    try {
        const newUserData = {
            name: req.body.name,
            email: req.body.email,
            role: req.body.role,
        };

        const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
            new: true,
            runValidators: true,
            useFindAndModify: false,
        });

        res.status(200).json({
            user,
        });
    } catch (error) {
        next(error);

    }

})








//  delete user
const deleteUser = catchAsyncErrors(async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return next(new ErrorHandler(`User does not exist with id: ${req.params.id}`, 404));
        }

        // Remove avatar from cloudinary
        if (user.avatar?.public_id) {
            await delete_file(user.avatar.public_id);
        }

        await user.remove();

        res.status(200).json({
            success: true,
        });
    } catch (error) {
        next(error);

    }

})








export {
    registerUser,
    loginUser,
    logout,
    uploadAvatar,
    forgotPassword,
    resetPassword,
    getUserProfile,
    updatePassword,
    updateProfile,
    allUsers,
    getUserDetails,
    updateUser,
    deleteUser
}