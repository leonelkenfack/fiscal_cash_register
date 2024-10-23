/** @odoo-module **/

import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { patch } from "@web/core/utils/patch";
import { useService } from "@web/core/utils/hooks";


function calculateDiscount(order) {
    let totalDiscount = 0;

    if (order.discount) {
        totalDiscount = order.discount;  
    } else {
        order.orderlines.forEach((line) => {
            const lineTotal = line.price * line.quantity;
            const lineDiscount = lineTotal * (line.discount / 100); 
            totalDiscount += lineDiscount;
        });
    }

    return totalDiscount.toFixed(2); 
}

function calculateTax(line) {
    return line.price * (line.tax_ids ? line.tax_ids[0].amount / 100 : 0);
}

function calculateSubtotal(order) {
    return order.orderlines.reduce((total, line) => total + line.price * line.quantity, 0);
}

function addSubtotalSection(order) {
    const subtotalLines = [];

    subtotalLines.push("\n_________________________________________________________________\n");

    subtotalLines.push(`Order: ${order.trackingNumber} Function Subtotal\n`);

    subtotalLines.push(`51,Print[\\t]Display[\\t]DiscountType[\\t]DiscountValue[\\t]\n`);

    const discountValue = calculateDiscount(order);  
    const discountType = 2; 

    subtotalLines.push(`51,1[\\t]1[\\t]${discountType}[\\t]${discountValue}[\\t]\n`);

    subtotalLines.push(`Print Print the amount after subtotal`);
    subtotalLines.push(`0 - Do not print`);
    subtotalLines.push(`1 - Print`);

    subtotalLines.push(`Display Show the subtotal on the customer display`);
    subtotalLines.push(`0 - Do not display`);
    subtotalLines.push(`1 - Display`);

    subtotalLines.push(`DiscountType - Discount type.`);

    return subtotalLines.join('\n');
}

function formatTransaction(order) {
    const lines = [];

    const customerVAT = order.partner ? order.partner.vat : "N/A";
    lines.push(`48,1[\\t]${order.uid}[\\t]1[\\t]I[\\t]${customerVAT}[\\t]`);

    order.orderlines.forEach((line, index) => {
        const taxAmount = calculateTax(line);
        const unit = line.product.uom_id ? line.product.uom_id[1] : "Units.";
        lines.push(`49,${line.full_product_name}[\\t]${index + 1}[\\t]${line.price.toFixed(2)}[\\t]${line.quantity.toFixed(3)}[\\t]${line.tax_ids ? 1 : ""}[\\t]${taxAmount.toFixed(2)}[\\t]1[\\t]${unit}[\\t]`);
    });

    const subtotal = calculateSubtotal(order).toFixed(2);
    const discountType = 2; 

    const printOption = 1; 
    const displayOption = 1; 
    lines.push(`51,${printOption}[\\t]${displayOption}[\\t]${discountType}[\\t]${subtotal}[\\t]`);
    
    lines.push("53,0[\\t][\\t]");

    lines.push("56");

    return lines.join('\n');
}

function saveAs(blob, fileName) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function sendTxtFile(fileContent, url) {
    if (url == undefined ) return

    const socket = new WebSocket('ws://' + url); 

    socket.onopen = function() {
        console.log("Connection established with the DUDE server.");
        socket.send(fileContent);
        console.log("TXT file sent to the DUDE server: \n" + fileContent);
    };

    socket.onmessage = function(event) {
        console.log("Response from DUDE server: " + event.data);
    };

    socket.onerror = function(error) {
        console.error("Error connecting to the DUDE server: ", error);
    };

    socket.onclose = function() {
        console.log("Connection with the DUDE server closed.");
    };
}

patch(PaymentScreen.prototype, {
    
    setup() {
        super.setup(...arguments);
        this.orm = useService("orm");
    },

    
    formatOrderData(order) {
        return formatTransaction(order)
    },
    
    createOrderTxtFile(order, url) {
        const data = this.formatOrderData(order) + addSubtotalSection(order);
        const blob = new Blob([data], { type: 'text/plain' });
        sendTxtFile(blob, url)
        saveAs(blob, `${order.name}.txt`);
    },
    

    async validateOrder(isForceValidate) {
        await super.validateOrder(...arguments);
        const order = this.pos.get_order(); 
        let auto_download_receipt = false 
        let url = undefined  

        try {
            const params = await this.pos.env.services.rpc('/fiscal_cash_register/configs')
            console.log(params);
            auto_download_receipt = params.auto_download_receipt;
            url = params.dude_com_url;
        } catch (error) {
            console.log(error);
        }

        console.log(order);

        //FIXME: fix onchange on auto_download_receipt
        if (auto_download_receipt){
            this.createOrderTxtFile(order, url);
        }
    }


});

