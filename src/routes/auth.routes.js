const {Router}=require("express")
const {registerUserController, loginUserController,logoutUserController,getMeController}=require("../controllers/auth.controller")
const authMiddleware=require("../middlewares/auth.middleware")
const authRouter=Router()

// @route Post (register a new user )
authRouter.post("/register",registerUserController)

//@route Post (login user with email and password)
authRouter.post("/login",loginUserController)

//@route GET (clear token from user cookie and token in the blacklist public)
authRouter.get("/logout",logoutUserController)

//@route GET (get the current logged in user details )
authRouter.get("/get-me",authMiddleware.authUser,getMeController)



module.exports=authRouter