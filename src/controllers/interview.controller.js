const pdfParse=require("pdf-parse")
const {generateInterviewReport,generateResumePdf}=require("../services/ai.service")
const interviewReportModel=require("../models/interviewReport.model")

//controller to generate interview report based on user self description,resume and job description
async function generateInterViewReportController(req,res){

      console.log("FILE:", req.file)

    if (!req.file) {
        return res.status(400).json({
            message: "Resume was not uploaded"
        })
    }

    console.log("Resume name:", req.file.originalname)
    console.log("Resume size:", req.file.size)


  const resumeContent=await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText()

  const {selfDescription,jobDescription}
=req.body

  const interViewReportByAi=await generateInterviewReport({
   resume:resumeContent.text,
   selfDescription,
   jobDescription
  })

  const interviewReport= await interviewReportModel.create({
    user:req.user.id,
    resume:resumeContent.text,
    selfDescription,
    jobDescription,
    ...interViewReportByAi
  })

  res.status(201).json({
    message:"Interview report generated successfully",
    interviewReport
  })
}


async function getInterviewReportByIdController(req,res){
  const {interviewId}=req.params

  const interviewReport=await interviewReportModel.findOne({_id:interviewId,user:req.user.id})
  if(!interviewReport){
  return res.status(404).json({
    message:"Interview report not found"
  })

}

  res.status(200).json({message:"Interview report fetched successfully",interviewReport})

}

async function getAllInterviewReportsController(req, res) {

  const interviewReports = await interviewReportModel
    .find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .select(
      "-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan"
    )

  res.status(200).json({
    message: "Interview reports fetched successfully",
    interviewReports
  })
}

//controller to generate resume pdf based on user self descriptopn,resume and job description
async function generateResumePdfController(req, res) {
    try {
        const { interviewReportId } = req.params

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewReportId,
            user: req.user.id
        })

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found"
            })
        }

        const {
            resume,
            jobDescription,
            selfDescription
        } = interviewReport

        const pdfBuffer = await generateResumePdf({
            resume,
            jobDescription,
            selfDescription
        })

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="resume_${interviewReportId}.pdf"`
        })

        res.send(pdfBuffer)

    } catch (error) {
        console.error("PDF generation error:", error)

        res.status(500).json({
            message: "Failed to generate resume PDF",
            error: error.message
        })
    }
}


module.exports={generateInterViewReportController, getInterviewReportByIdController,getAllInterviewReportsController,
  generateResumePdfController
}