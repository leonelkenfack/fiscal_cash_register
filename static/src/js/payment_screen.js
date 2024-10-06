/** @odoo-module **/

import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { patch } from "@web/core/utils/patch";
import { useService } from "@web/core/utils/hooks";


function formatDate(date) {
    const options = { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return new Intl.DateTimeFormat('en-GB', options).format(date) + ' DST';
}

function calculateBCC(data) {
    let bcc = 0;
    for (let i = 0; i < data.length; i++) {
        bcc ^= data.charCodeAt(i); // Calcul  checksum (BCC)
    }
    return bcc.toString(16).toUpperCase(); 
}

function formatOrderData(order) {
    let seq = 1; // Int sequence compter
    const formattedOrder = [];

    function addBlock(command, data) {
        const len = data.length + 2;
        const block = `<01><${len}><${seq}>${command}<DATA>${data}`;
        const bcc = calculateBCC(block);
        formattedOrder.push(`${block}<05><${bcc}><03>`);
        seq++;
    }

    // Order name 
    addBlock('CMD_ORDER', `Order Name\t${order.name}`);

    // Order datetime
    addBlock('CMD_ORDER', `Date\t${formatDate(order.date_order)}`);

    // Cashier detail
    addBlock('CMD_ORDER', `Cashier\t${order.cashier.name}`);

    // Order lines
    order.orderlines.forEach(line => {
        addBlock('CMD_ORDER_LINES', `CID\t${line.cid}\nProduct\t${line.full_product_name}\nPrice\t${line.price.toFixed(2)}\nQuantity\t${line.quantity.toFixed(3)}`);
    });

    // Payment lines
    order.paymentlines.forEach(payment => {
        addBlock('CMD_PAYMENT_LINES', `CID\t${payment.cid}\nAmount\t${payment.amount.toFixed(2)}\nPayment Type\t${payment.name}`);
    });

    // Customer details
    if (order.partner) {
        addBlock('CMD_PARTNER', `Partner Name\t${order.partner.name}\nPhone\t${order.partner.phone || "N/A"}\nCountry\t${order.partner.country || "N/A"}\nVAT\t${order.partner.vat || "N/A"}`);
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
    
    setup() {
        super.setup(...arguments);
        this.orm = useService("orm");
    },

    // Override POS validateOrder method
    async validateOrder(isForceValidate) {
        await super.validateOrder(...arguments);
        const order = this.pos.get_order();
        
        // try {
        //     const params = await this.orm.searchRead("ir.config_parameter", [["key", "=", "fiscal_cash_register.auto_download_receipt"]], ["value"]);
        //     console.log(params[0]);
        // } catch (error) {
        //     console.log(error);
        // }

        console.log(order);
        
        createOrderTxtFile(order);
    }


});

