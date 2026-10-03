const Groq = require("groq-sdk")
const { z } = require("zod")
const puppeteer = require("puppeteer")


const ai = new Groq({
    apiKey: process.env.GROQ_API_KEY
})


// ========================================
// INTERVIEW REPORT SCHEMA
// ========================================

const interviewReportSchema = z.object({

    matchScore: z
        .number()
        .describe(
            "A score between 0 and 100 indicating how well the candidate's profile matches the job description"
        ),

    technicalQuestions: z
        .array(
            z.object({
                question: z
                    .string()
                    .describe(
                        "The technical question that can be asked in the interview"
                    ),

                intention: z
                    .string()
                    .describe(
                        "The intention of the interviewer behind asking this question"
                    ),

                answer: z
                    .string()
                    .describe(
                        "How to answer this question, what points to cover, and what approach to take"
                    )
            })
        )
        .describe(
            "Technical questions that can be asked in the interview along with their intention and how to answer them"
        ),

    behavioralQuestions: z
        .array(
            z.object({
                question: z
                    .string()
                    .describe(
                        "The behavioral question that can be asked in the interview"
                    ),

                intention: z
                    .string()
                    .describe(
                        "The intention of the interviewer behind asking this question"
                    ),

                answer: z
                    .string()
                    .describe(
                        "How to answer this question, what points to cover, and what approach to take"
                    )
            })
        )
        .describe(
            "Behavioral questions that can be asked in the interview along with their intention and how to answer them"
        ),

    skillGaps: z
        .array(
            z.object({
                skill: z
                    .string()
                    .describe(
                        "The skill which the candidate is lacking"
                    ),

                severity: z
                    .enum(["low", "medium", "high"])
                    .describe(
                        "The severity of the skill gap"
                    )
            })
        )
        .describe(
            "List of skill gaps in the candidate's profile along with their severity"
        ),

    preparationPlan: z
        .array(
            z.object({
                day: z
                    .number()
                    .describe(
                        "The day number in the preparation plan, starting from 1"
                    ),

                focus: z
                    .string()
                    .describe(
                        "The main focus of this day in the preparation plan"
                    ),

                tasks: z
                    .array(z.string())
                    .describe(
                        "List of tasks to be done on this day"
                    )
            })
        )
        .describe(
            "A day-wise preparation plan for the candidate"
        ),

    title: z
        .string()
        .describe(
            "The title of the job for which the interview report is generated"
        )
})


// ========================================
// GENERATE INTERVIEW REPORT
// ========================================

async function generateInterviewReport({
    resume,
    selfDescription,
    jobDescription
}) {

    const prompt = `
Generate an interview preparation report for the candidate.

Analyze the candidate's resume, self-description, and job description.

Return ONLY JSON matching the provided schema.

Resume:
${resume}

Self Description:
${selfDescription}

Job Description:
${jobDescription}

IMPORTANT OUTPUT REQUIREMENTS:

- Generate exactly 5 technical questions.
- Generate exactly 5 behavioral questions.
- Keep each intention concise and under 20 words.
- Keep each answer between 50 and 100 words.
- Generate relevant skill gaps based only on the candidate's actual information.
- Generate a 7-day preparation plan.
- Keep preparation tasks concise.
- Do not include unnecessary explanations.
- Do not invent experience, skills, projects, companies, certifications, or achievements.
`


    const schema = z.toJSONSchema(interviewReportSchema)

    delete schema.$schema


    const response = await ai.chat.completions.create({

        model: "openai/gpt-oss-20b",

        messages: [
            {
                role: "system",
                content:
                    "You are an expert technical recruiter and interview preparation assistant. Generate accurate and practical interview preparation reports."
            },
            {
                role: "user",
                content: prompt
            }
        ],

        response_format: {
            type: "json_schema",

            json_schema: {
                name: "interview_report",
                strict: true,
                schema: schema
            }
        },

        temperature: 0.2,

        max_completion_tokens: 8000
    })


    const content =
        response.choices[0]?.message?.content


    if (!content) {
        throw new Error("Groq returned an empty response")
    }


    const result =
        JSON.parse(content)


    const validatedResult =
        interviewReportSchema.parse(result)


    return validatedResult
}

// ========================================
// GENERATE PDF FROM HTML
// ========================================

async function generatePdfFromHtml(htmlContent) {

    if (!htmlContent || typeof htmlContent !== "string") {
        throw new Error("Invalid HTML content received")
    }

    console.log("Generating PDF from HTML...")
    console.log("HTML length:", htmlContent.length)


    const browser = await puppeteer.launch({

        headless: true,

        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox"
        ]
    })


    try {

        const page = await browser.newPage()


        await page.setContent(htmlContent, {
            waitUntil: "networkidle0"
        })


        const pdfBuffer = await page.pdf({

            format: "A4",

            printBackground: true,

            margin: {
                top: "20mm",
                bottom: "20mm",
                left: "15mm",
                right: "15mm"
            }
        })


        console.log("PDF generated successfully")
        console.log("PDF size:", pdfBuffer.length)


        return pdfBuffer

    } finally {

        await browser.close()

    }
}


// ========================================
// RESUME PDF SCHEMA
// ========================================

const resumePdfSchema = z.object({

    html: z
        .string()
        .describe(
            "The complete HTML content of the resume which can be converted to PDF using Puppeteer"
        )
})


// ========================================
// GENERATE RESUME PDF
// ========================================

async function generateResumePdf({
    resume,
    selfDescription,
    jobDescription
}) {

    const prompt = `
Generate a professional ATS-friendly resume for the candidate.

Candidate Resume:
${resume}

Self Description:
${selfDescription}

Target Job Description:
${jobDescription}

Requirements:

- Tailor the resume to the given job description.
- Highlight relevant technical skills.
- Highlight relevant projects and experience.
- Use professional human-written language.
- Do not make the resume sound AI-generated.
- Do not invent companies, degrees, jobs, projects, certifications, skills, or achievements.
- Only use information provided in the candidate's resume and self-description.
- Make the resume ATS friendly.
- Use clear headings.
- Use bullet points where appropriate.
- Keep the resume concise.
- Ideally keep it within 1-2 pages.
- Generate complete HTML.
- Include CSS inside the HTML itself.
- Do not use external CSS files.
- Do not use JavaScript.
- Keep the design simple and professional.

IMPORTANT:
Return ONLY valid JSON.

The JSON must have exactly one property:
{
    "html": "complete HTML resume"
}

Do not return markdown.
Do not use code fences.
Do not add any explanation outside the JSON.
`


    const response =
        await ai.chat.completions.create({

            model: "openai/gpt-oss-20b",

            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert professional resume writer who creates ATS-friendly resumes tailored to software engineering roles. Always return the requested output as valid JSON."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],

            response_format: {
                type: "json_object"
            },

            temperature: 0.2
        })


    const content =
        response.choices[0]?.message?.content


    if (!content) {
        throw new Error("Groq returned an empty resume response")
    }


    console.log("Groq resume response received")


    const jsonContent =
        JSON.parse(content)


    const validatedContent =
        resumePdfSchema.parse(jsonContent)


    const pdfBuffer =
        await generatePdfFromHtml(validatedContent.html)


    return pdfBuffer
}


// ========================================
// EXPORT
// ========================================

module.exports = {
    generateInterviewReport,
    generateResumePdf
}