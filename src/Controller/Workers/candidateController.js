


import { uploadToCloudinary } from '../../Utils/imageUpload.js';
import mongoose from 'mongoose';
import Candidate from '../../Modal/Candidate/Candidate.js'
// Generate unique name like wo232
const generateUniqueName = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    let result = '';

    // Add 2 random letters
    for (let i = 0; i < 2; i++) {
        result += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    // Add 3 random numbers
    for (let i = 0; i < 3; i++) {
        result += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    return result;
};

// Get candidate profile
export const getCandidateProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const candidate = await Candidate.findOne({ user_id: userId })
            .populate('user_id', 'email role');

        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: 'Candidate profile not found'
            });
        }

        // Include virtual age field in response
        const candidateData = candidate.toObject();
        candidateData.age = candidate.age;

        res.status(200).json({
            success: true,
            data: candidateData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Create or update candidate profile
export const saveCandidateProfile = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;

        // Destructure all possible fields from request body
        const {
            name,
            id_no,
            location,
            date_of_birth,
            address,
            pan_no,
            contact_no,
            id_type,
            id_detail,
            education,
            certificates,
            skills,
            services,
            available_for_join,
            joining_date,
            portfolio_links
        } = req.body;

        // Check if candidate profile already exists
        let candidate = await Candidate.findOne({ user_id: userId }).session(session);

        // If profile doesn't exist, create a new one
        if (!candidate) {
            candidate = new Candidate({
                user_id: userId,
                uniquename: generateUniqueName(),
                name: name || 'New Candidate' // Default name if not provided
            });
        }


        // Handle image upload if present
        if (req.file?.buffer) {
            const result = await uploadToCloudinary(req.file.buffer, 'worker-profile');
            console.log('✅ Cloudinary Upload Result:', result);
            candidate.image = result.secure_url;
        }

        // Update fields from request body
        if (name !== undefined) candidate.name = name;
        if (id_no !== undefined) candidate.id_no = id_no;
        if (location !== undefined) candidate.location = location;
        if (date_of_birth !== undefined) candidate.date_of_birth = new Date(date_of_birth);
        if (address !== undefined) candidate.address = address;
        if (pan_no !== undefined) candidate.pan_no = pan_no;
        if (contact_no !== undefined) candidate.contact_no = contact_no;
        if (id_type !== undefined) candidate.id_type = id_type;
        if (id_detail !== undefined) candidate.id_detail = id_detail;

        // Handle array/object fields that might be stringified
        if (education !== undefined) {
            try {
                candidate.education = typeof education === 'string' ?
                    JSON.parse(education) : education;
            } catch (e) {
                candidate.education = education;
            }
        }

        if (certificates !== undefined) {
            try {
                candidate.certificates = typeof certificates === 'string' ?
                    JSON.parse(certificates) : certificates;
            } catch (e) {
                candidate.certificates = certificates;
            }
        }

        if (skills !== undefined) {
            try {
                candidate.skills = typeof skills === 'string' ?
                    JSON.parse(skills) : skills;
            } catch (e) {
                candidate.skills = skills;
            }
        }

        if (services !== undefined) {
            try {
                candidate.services = typeof services === 'string' ?
                    JSON.parse(services) : services;
            } catch (e) {
                candidate.services = services;
            }
        }

        if (available_for_join !== undefined) {
            candidate.available_for_join = available_for_join === 'true' || available_for_join === true;
        }

        if (joining_date !== undefined) candidate.joining_date = new Date(joining_date);

        if (portfolio_links !== undefined) {
            try {
                candidate.portfolio_links = typeof portfolio_links === 'string' ?
                    JSON.parse(portfolio_links) : portfolio_links;
            } catch (e) {
                candidate.portfolio_links = portfolio_links;
            }
        }

        // Save the candidate profile
        await candidate.save({ session });

        await session.commitTransaction();
        session.endSession();

        // Include virtual age field in response
        const candidateData = candidate.toObject();
        candidateData.age = candidate.age;

        res.status(200).json({
            success: true,
            message: 'Candidate profile saved successfully',
            data: candidateData
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        res.status(500).json({
            success: false,
            message: 'Error saving candidate profile',
            error: error.message
        });
    }
};