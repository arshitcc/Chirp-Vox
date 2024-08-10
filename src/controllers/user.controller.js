import { asyncHandler } from "../utils/asyncHandler.js";

const userCreate = asyncHandler(async (req, res) => {
    res.status(201).json({
        message : 'Account has been created BITCH!!',
    })
})

export { userCreate }