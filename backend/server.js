
import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import cookieParser from 'cookie-parser'
import connectDB from './config/db.js'
import authRouter from './routes/user.route.js';
import orderRouter from './routes/order.route.js';
import paymentsRouter from './routes/payment.route.js';
import productRouter from './routes/product.route.js';






//  app config
const app = express()
const port = process.env.PORT || 4000




//  middlewares
app.use(cors({
    origin: [process.env.FRONTEND_URL],
    methods: ["POST", "GET", "PUT", "DELETE"],
    credentials: true,
}));
app.use(express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    },
}));
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }))





//  database conection

await connectDB()






//  api endpoint

app.get('/', (req, res) => {
    res.send('api working')
})

app.use('/api/v1', authRouter);
app.use('/api/v1', orderRouter);
app.use('/api/v1', paymentsRouter);
app.use('/api/v1', productRouter);




//  listen
app.listen(port, () => {
    console.log(`server is runnign at port ${port}`);

})