
import Order from '../models/order.model.js'
import Product from '../models/product.model.js'
import ErrorHandler from '../utils/errorHandler.js'
import cathAsyncError from '../middlewares/catchAsyncErrors.js'


// create new order
const newOrder = cathAsyncError(async (req, res, next) => {
    try {
        const {
            orderItems,
            shippingInfo,
            itemsPrice,
            taxAmount,
            shippingAmount,
            totalAmount,
            paymentMethod,
            paymentInfo,
        } = req.body;

        const order = await Order.create({
            orderItems,
            shippingInfo,
            itemsPrice,
            taxAmount,
            shippingAmount,
            totalAmount,
            paymentMethod,
            paymentInfo,
            user: req.user._id,
        });

        res.status(200).json({ order });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }

})


// get current user order

const myOrders = cathAsyncError(async (req, res, next) => {
    try {
        const orders = await Order.find({ user: req.user._id });

        res.status(200).json({ orders });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }

})




// get order details
const getOrderDetails = cathAsyncError(async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id).populate("user", "name email");
        if (!order) {
            return next(new ErrorHandler("No Order found with this ID", 404));
        }

        res.status(200).json({ order });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }

})

// get all orders- admin
const allOrders = cathAsyncError(async (req, res, next) => {
    try {
        const orders = await Order.find();

        res.status(200).json({ orders });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }

})


// update orders
const updateOrder = cathAsyncError(async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return next(new ErrorHandler("No Order found with this ID", 404));
        }

        if (order?.orderStatus === "Delivered") {
            return next(new ErrorHandler("You have already delivered this order", 400));
        }

        let productNotFound = false;

        // Update products stock
        for (const item of order.orderItems) {
            const product = await Product.findById(item?.product?.toString());
            if (!product) {
                productNotFound = true;
                break;
            }
            product.stock = product.stock - item.quantity;
            await product.save({ validateBeforeSave: false });
        }

        if (productNotFound) {
            return next(new ErrorHandler("No Product found with one or more IDs.", 404));
        }

        order.orderStatus = req.body.status;
        order.deliveredAt = Date.now();

        await order.save();

        res.status(200).json({ success: true });
    } catch (error) {
    }

})



// delete order
const deleteOrder = cathAsyncError(async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return next(new ErrorHandler("No Order found with this ID", 404));
        }

        await order.deleteOne();

        res.status(200).json({ success: true });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
})



// Helper Functions
async function getSalesData(startDate, endDate) {
    try {
        const salesData = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(startDate),
                        $lte: new Date(endDate),
                    },
                },
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    },
                    totalSales: { $sum: "$totalAmount" },
                    numOrders: { $sum: 1 },
                },
            },
        ]);

        const salesMap = new Map();
        let totalSales = 0;
        let totalNumOrders = 0;

        salesData.forEach((entry) => {
            const date = entry?._id.date;
            const sales = entry?.totalSales;
            const numOrders = entry?.numOrders;

            salesMap.set(date, { sales, numOrders });
            totalSales += sales;
            totalNumOrders += numOrders;
        });

        const datesBetween = getDatesBetween(startDate, endDate);

        const finalSalesData = datesBetween.map((date) => ({
            date,
            sales: (salesMap.get(date) || { sales: 0 }).sales,
            numOrders: (salesMap.get(date) || { numOrders: 0 }).numOrders,
        }));

        return { salesData: finalSalesData, totalSales, totalNumOrders };
    } catch (error) {
        throw new Error(error.message);
    }
}

function getDatesBetween(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);

    while (currentDate <= new Date(endDate)) {
        const formattedDate = currentDate.toISOString().split("T")[0];
        dates.push(formattedDate);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
}



// get sales
const getSales = cathAsyncError(async (req, res, next) => {
    try {
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(req.query.endDate);

        startDate.setUTCHours(0, 0, 0, 0);
        endDate.setUTCHours(23, 59, 59, 999);

        const { salesData, totalSales, totalNumOrders } = await getSalesData(
            startDate,
            endDate
        );

        res.status(200).json({
            totalSales,
            totalNumOrders,
            sales: salesData,
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }

})




export {
    newOrder,
    myOrders,
    getOrderDetails,
    allOrders,
    updateOrder,
    deleteOrder,
    getSales,
    getDatesBetween,
    getSalesData
}