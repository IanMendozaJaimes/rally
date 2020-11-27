const { questions, challenges, time, goal } = require('./config.json')
const pdf = require('html-pdf')
const fs = require('fs')

const { dialog } = require('electron').remote
const ipc = require('electron').ipcRenderer

const path = require('path')
const directory = '../images/'

const alertTypes = {
    success: 'success',
    warning: 'warning',
    error: 'error'
}

questions.sort(() => Math.random() - 0.5)
challenges.sort(() => Math.random() - 0.5)

let questionNumber = 0
let challengeNumber = 0
let teamNumber = ''
let timer = null
let timerPID = null
let imagePath = null
let participants = []

const correctQuestions = []
const skipedQuestions = {}

const blackScreen = document.querySelector('.alert-screen')

const sectionStart = document.querySelector('.start')
const sectionStartButton = document.querySelector('.start-button')
const sectionStartAdd = document.querySelector('.start-add')
const sectionStartParticipants = document.querySelector('.start-participants')

const sectionQuestions = document.querySelector('.questions')
const sectionQuestionsQuestion = document.querySelector('.questions-question')
const sectionQuestionsNumber = document.querySelector('.questions-number')
const sectionQuestionsValidate = document.querySelector('.questions-validate')
const sectionQuestionsAnswer = document.querySelector('.questions-answer')
const sectionQuestionsTimer = document.querySelector('.questions-timer')
const sectionQuestionsTimerContainer = document.querySelector('.questions-timer-container')
const sectionQuestionsValidationContainer = document.querySelector('.validation-container')
const sectionQuestionsWrongContainer = document.querySelector('.wrong-container')
const sectionQuestionsBeginChallenge = document.querySelector('.begin-challenge-button')
const sectionQuestionsRetry = document.querySelector('.retry-button')

const sectionChallenges = document.querySelector('.challenges')
const sectionChallengesDescription = document.querySelector('.challenges-description')
const sectionChallengesDone = document.querySelector('.challenges-done')
const sectionChallengesSubmit = document.querySelector('.challenge-submit')
const sectionChallengesResubmit = document.querySelector('.challenge-resubmit')

const sectionSummary = document.querySelector('.summary')
const sectionSummaryExport = document.querySelector('.summary-export')

function showAlert (message, type) {
    blackScreen.classList.remove('invisible')
    ipc.send('alert', { message, type })
}

function hiddeElement (element, anotherClass) {
    if (anotherClass) {
        element.classList.remove(anotherClass)
    }
    element.classList.add('invisible')
}

function showElement (element, anotherClass) {
    element.classList.remove('invisible')
    if (anotherClass) {
        element.classList.add(anotherClass)
    }
}

function showSummary () {
    clearInterval(timerPID)

    const participantsContainer = document.querySelector('.pdf-participants')
    const questionsContainer = document.querySelector('.pdf-questions')

    document.querySelector('.pdf-team').innerHTML = teamNumber
    document.querySelector('.summary-time').innerHTML = formatTime((time * 60) - timer)
    document.querySelector('.pdf-num-answers').innerHTML = correctQuestions.length
    document.querySelector('.back1').style.backgroundImage = `url('file:///${path.join(__dirname, '/pattern.jpg')}')`.replace(/\\/g, '/')

    console.log('url image:', `url('file:///${path.join(__dirname, '/pattern.jpg')}')`.replace(/\\/g, '/'))

    hiddeElement(sectionQuestionsTimerContainer, 'flex-container-nowrap')
    hiddeElement(sectionQuestionsTimerContainer, 'questions-timer-container')

    for (const p of participants) {
        const partipantTemplate = document.querySelector('#template-pdf-participant')
        const clone = document.importNode(partipantTemplate.content, true)
        clone.querySelector('.pdf-participant').innerHTML = p
        participantsContainer.appendChild(clone)
    }

    for (let i = 1; i < questionNumber; i++) {
        const questionTemplate = document.querySelector('#template-pdf-question')
        const clone = document.importNode(questionTemplate.content, true)
        clone.querySelector('.pdf-question-number').innerHTML = i
        clone.querySelector('.pdf-question-desc').innerHTML = questions[i-1].question
        const status = clone.querySelector('.pdf-status-desc')
        if (skipedQuestions[i]) {
            const { challengeId, imagePath } = skipedQuestions[i]
            status.innerHTML = 'Saltada'
            status.classList.add('status-bad')
            clone.querySelector('.pdf-challenge-container').classList.remove('invisible')
            clone.querySelector('.pdf-challenge-desc').innerHTML = challenges[challengeId]
            clone.querySelector('.pdf-challenge-img').src = imagePath
            console.log('image path:', imagePath)
        } else {
            clone.querySelector('.pdf-challenge-container').classList.add('invisible')
            status.innerHTML = 'Resuelta'
            status.classList.add('status-good')
        }
        questionsContainer.appendChild(clone)
    }

    sectionChallenges.classList.add('invisible')
    hiddeElement(sectionQuestions, 'flex-container')
    sectionStart.classList.add('invisible')
    sectionQuestionsTimerContainer.classList.add('invisible')
    sectionSummary.classList.remove('invisible')
}

async function generateSummary () {
    const properties = ['openDirectory']
    dialog.showOpenDialog({ 
        title: 'Selecciona una carpeta donde guardar el reporte', 
        buttonLabel: 'Seleccionar', 
        properties
    }).then(file => {
        console.log(file, file.filePaths, file.filePaths[0])
        const filePath = path.join(file.filePaths[0], 'reporteRally.pdf')
        const summary = document.querySelector('.pdf')
        // const options = {
        //     format: 'Letter',
        //     base: path.join('file:/', __dirname, '../src').replace('file:/', 'file:///'),
        //     border: {
        //         top: '1.5in',
        //         right: '1in',
        //         bottom: '1.5in',
        //         left: '1in'
        //     }
        // }

        let template = fs.readFileSync(path.join(__dirname, '../src/report-template.html'), 
            { encoding:'utf8', flag:'r' })
        template = template.replace('{{report}}', summary.outerHTML)
       
        let conversion = require("phantom-html-to-pdf")()
        conversion({
            html: template,
            allowLocalFilesAccess: true,
            paperSize: {
                format: 'Letter',
                margin: {
                    top: '1.5in',
                    right: '1.5in',
                    bottom: '1.5in',
                    left: '1.5in'
                }
            }
        }, function(err, pdf) {
          let output = fs.createWriteStream(filePath)
          console.log(pdf.logs)
          console.log(pdf.numberOfPages)
            // since pdf.stream is a node.js stream you can use it
            // to save the pdf to a file (like in this example) or to
            // respond an http request.
          pdf.stream.pipe(output);
          showAlert('El reporte fue generado exitosamente', alertTypes.success);
        })

        // pdf.create(template, options).toFile(filePath, 
        //     function(err, res) {
        //         if (err) return console.log(err);
        //         console.log(res)
        //     }
        // ) 

    }).catch(err => { 
        console.log(err) 
    })
}

function renderQuestion () {
    sectionQuestionsNumber.innerHTML = `Pregunta número ${questionNumber}`
    sectionQuestionsQuestion.innerHTML = questions[questionNumber - 1].question
    sectionQuestionsAnswer.value = ''
    showElement(sectionQuestionsValidationContainer, 'flex-container')
    hiddeElement(sectionQuestionsWrongContainer, 'flex-container')
}

function nextQuestion () {
    questionNumber += 1
    if (questionNumber > questions.length || correctQuestions.length == goal) {
        showSummary()
    } else {
        renderQuestion()
    }
}

function wrongAnswer () {
    showAlert('La respuesta no es correcta', alertTypes.error)
    hiddeElement(sectionQuestionsValidationContainer, 'flex-container')
    showElement(sectionQuestionsWrongContainer, 'flex-container')
}

function validateAnswer () {
    if (sectionQuestionsAnswer.value === questions[questionNumber - 1].answer) {
        showAlert('Bien hecho, la respuesta es correcta.', alertTypes.success)
        correctQuestions.push(questionNumber)
        nextQuestion()
    } else {
        wrongAnswer()
    }
}

function formatTime (t) {
    const tr = t || timer
    const hours = parseInt(tr / 3600)
    const minutes = parseInt(tr / 60) - (hours * 60)
    const seconds = tr % 60
    return `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
}

function updateTime () {
    timer -= 1
    if (timer >= 0) {
        sectionQuestionsTimer.innerHTML = formatTime()
    } else { showSummary() }
}

function beginChallenge () {
    hiddeElement(sectionQuestions, 'flex-container')
    showElement(sectionChallenges)
    sectionChallengesDescription.innerHTML = challenges[challengeNumber]   
}

function uploadPhoto () {
    
    const properties = ['openFile']

    if (process.platform === 'darwin') {
        properties.push('openDirectory')
    }

    dialog.showOpenDialog({ 
        title: 'Selecciona una foto como evidencia',
        buttonLabel: 'Seleccionar', 
        filters: [{ 
            name: 'Fotos', 
            extensions: ['jpg', 'png'] 
        }], 
        properties
    }).then(file => {
        if (!file.canceled) { 
          imagePath = 'file:///' + file.filePaths[0].toString()
          hiddeElement(sectionChallengesSubmit)

          document.querySelector('.challenge-image').src = imagePath
          const challengePhoto = document.querySelector('.challenge-photo')
          showElement(challengePhoto, 'flex-container')
        }
    }).catch(err => { 
        console.log(err) 
    })

}

function completeChallenge () {
    if (imagePath === null) {
        showAlert('No has seleccionado ninguna imagen.', alertTypes.error)
        return
    }
    hiddeElement(sectionChallenges)
    showElement(sectionQuestions, 'flex-container')
    skipedQuestions[questionNumber] = {
        challengeId: challengeNumber,
        imagePath
    }
    challengeNumber += 1
    imagePath = null
    nextQuestion()
}

function addParticipant () {
    const participantsTemplate = document.querySelector('#template-participant')
    const clone = document.importNode(participantsTemplate.content, true)
    sectionStartParticipants.appendChild(clone)
}

function saveParticipants () {
    participants = []
    const participantNodes = document.querySelectorAll('.participant')
    for (const p of participantNodes) {
        if (p.value.length > 0) {
            participants.push(p.value)
        }
    }
    console.log(participants)
}

function beforeStart () {
    addParticipant()
    console.log(path.join(__dirname, '../src'))
    console.log(path.join('file://', __dirname, '../src'))
}
beforeStart()

sectionStartAdd.addEventListener('click', addParticipant)

sectionStartButton.addEventListener('click', async () => {
    saveParticipants()
    const team = document.querySelector('.start-team')
    teamNumber = team.value

    if (teamNumber.length === 0) {
        showAlert('El equipo no tiene nombre', alertTypes.error)
        return
    }
    
    if (participants.length === 0) {
        showAlert('El equipo no tiene participantes', alertTypes.error)
        return
    }

    sectionStart.classList.add('invisible')
    showElement(sectionQuestions, 'flex-container')
    sectionQuestionsTimerContainer.classList.remove('invisible')
    timer = time * 60 + 1
    nextQuestion()
    updateTime()
    timerPID = setInterval(updateTime, 1000)
})

sectionQuestionsValidate.addEventListener('click', validateAnswer)

sectionQuestionsBeginChallenge.addEventListener('click', beginChallenge)

sectionQuestionsRetry.addEventListener('click', renderQuestion)

sectionChallengesDone.addEventListener('click', completeChallenge)

sectionChallengesSubmit.addEventListener('click', uploadPhoto)
sectionChallengesResubmit.addEventListener('click', uploadPhoto)

sectionSummaryExport.addEventListener('click', generateSummary)

ipc.on('remove-alert', (event) => {
    blackScreen.classList.add('invisible')
})
