import multer from "multer";

// The disk storage engine gives you full control on storing files to disk.
// Using diskStorage because memoryStorage might getFull as per user's usage

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
      cb(null, './public/temp')
    },

    filename: function (req, file, cb) {
    //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    //   cb(null, file.fieldname + '-' + uniqueSuffix)
      cb(null, file.originalname);
    }
  })
  
// export  const upload = multer({ storage: storage })
export  const upload = multer({ storage, })