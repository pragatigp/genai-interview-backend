const express=require("express")
const authMiddleware=require("../middlewares/auth.middleware")
const interviewController=require("../controllers/interview.controller")
const upload=require("../middlewares/file.middleware")

const interviewRouter=express.Router()


//@route POST /Api/interview/ (generate new interview report on the basis of user self description,resume pdf and job job description) access private
interviewRouter.post("/",authMiddleware.authUser,upload.single("resume"),interviewController.generateInterViewReportController)

//@route GET /api/interview/report/:interviewId (get interview report by interviewId) access private

interviewRouter.get("/report/:interviewId",authMiddleware.authUser,interviewController.getInterviewReportByIdController)


//@route GET /api/interview(get all the interview reports of all logged in user) acees private
interviewRouter.get("/",authMiddleware.authUser,interviewController.getAllInterviewReportsController)

//@route GET/api/interview/resume/pdf 
//generate resume pdf on the basis of user self description,resume content and job description(access private)

interviewRouter.post("/resume/pdf/:interviewReportId",authMiddleware.authUser,interviewController.generateResumePdfController)

module.exports= interviewRouter