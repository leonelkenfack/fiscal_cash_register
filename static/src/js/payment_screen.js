/** @odoo-module **/

import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { patch } from "@web/core/utils/patch";


function formatDate(date) {
    const options = { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return new Intl.DateTimeFormat('en-GB', options).format(date) + ' DST';
}

function formatOrderData(order) {
    const formattedOrder = [];

    // Header of the order
    formattedOrder.push(`<01><LEN><SEQ>CMD_ORDER<DATA>`);
    formattedOrder.push(`Order Name\t${order.name}`);
    formattedOrder.push(`Date\t${formatDate(order.date_order)}`);
    formattedOrder.push(`Cashier\t${order.cashier.name}`);
    formattedOrder.push(`<05><BCC><03>`);

    // Order details
    formattedOrder.push(`<01><LEN><SEQ>CMD_ORDER_LINES<DATA>`);
    order.orderlines.forEach(line => {
        formattedOrder.push(`CID\t${line.cid}`);
        formattedOrder.push(`Product\t${line.full_product_name}`);
        formattedOrder.push(`Price\t${line.price.toFixed(2)}`);
        formattedOrder.push(`Quantity\t${line.quantity.toFixed(3)}`);
        // formattedOrder.push(`Tax IDs\t${line.tax_ids.join(",")}`);
    });
    formattedOrder.push(`<05><BCC><03>`);

    // Order paiement lines
    formattedOrder.push(`<01><LEN><SEQ>CMD_PAYMENT_LINES<DATA>`);
    order.paymentlines.forEach(payment => {
        formattedOrder.push(`CID\t${payment.cid}`);
        formattedOrder.push(`Amount\t${payment.amount.toFixed(2)}`);
        formattedOrder.push(`Payment Type\t${payment.name}`);
    });
    formattedOrder.push(`<05><BCC><03>`);

    // Customer informations
    if (order.partner) {
        formattedOrder.push(`<01><LEN><SEQ>CMD_PARTNER<DATA>`);
        formattedOrder.push(`Partner Name\t${order.partner.name}`);
        formattedOrder.push(`Phone\t${order.partner.phone || "N/A"}`);
        formattedOrder.push(`Country\t${order.partner.country || "N/A"}`);
        formattedOrder.push(`<05><BCC><03>`);
    }

    return formattedOrder.join('\n');
}



function createOrderTxtFile(order) {
    const data = formatOrderData(order);  
    const blob = new Blob([data], { type: 'text/plain' });
    saveAs(blob, `${order.name}.txt`); 
}


function saveAs(blob, fileName) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}


patch(PaymentScreen.prototype, {
    
    // Override POS validateOrder method
    async validateOrder(isForceValidate) {
        await super.validateOrder(...arguments);
        const order = this.pos.get_order();
        console.log(order);
        createOrderTxtFile(order);
    }
});

