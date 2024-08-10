// Promises Approach : 

const asyncHandler = (requestHandler) => {
    return ( req, res, next) => {
        Promise.resolve(requestHandler(req,res,next)).catch((err) => next(err)) 
    }
}

// Try-Catch Approach
/* 
    const asyncHandler = (func) => ( async(err, req, res, next) => {
    try {
        await func(req, res, next)
    } catch (error) {
        // res.status(err.code || 500);
        res.status(err.code || 500).json({
            success : false,
            message : err.message
        })

    }
})
*/

export { asyncHandler }