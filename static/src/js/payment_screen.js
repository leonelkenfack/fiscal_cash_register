/** @odoo-module **/

import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { patch } from "@web/core/utils/patch";
import { useService } from "@web/core/utils/hooks";

function calculateBCC(data) {
    // Calculate the checksum (BCC)

    let bcc = 0;
    for (let i = 0; i < data.length; i++) {
        bcc ^= data.charCodeAt(i); 
    }
    return bcc.toString(16).toUpperCase(); 
}

function formatDate(date) {
    const options = { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return new Intl.DateTimeFormat('en-GB', options).format(date) + ' DST';
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

    
    formatOrderData(order) {
        let seq = 1;
        const formattedOrder = [];
    
        // Helper to blocs with the BCC calcul
        function addBlock(command, data) {
            const len = data.length + 2; // Ajust message length
            const block = `<01><${len}><${seq}>${command}<DATA>${data}`;
            const bcc = calculateBCC(block);
            formattedOrder.push(`${block}<05><${bcc}><03>`);
            seq++;
        }
    
        // Add Order name
        addBlock('CMD_ORDER', `Order Reference\t${order.name}`);
    
        // Add Order time
        addBlock('CMD_ORDER', `Date\t${formatDate(order.date_order)}`);
    
        // Add Cashier name and id
        addBlock('CMD_ORDER', `Cashier Name\t${order.cashier.name}\nCashier ID\t${order.cashier.fiscal_id || "N/A"}`);
    
        // Add Order lines with tax
        order.orderlines.forEach((line, index) => {
            addBlock('CMD_ORDER_LINES', `CID\t${line.cid}\nProduct\t${line.full_product_name}\nPrice\t${line.price.toFixed(2)}\nQuantity\t${line.quantity.toFixed(3)}\nTax\t${order.pos.taxes[index].name}`);
        });
    
        // Add Payment lines with tax
        order.paymentlines.forEach(payment => {
            addBlock('CMD_PAYMENT_LINES', `CID\t${payment.cid}\nAmount\t${payment.amount.toFixed(2)}\nPayment Type\t${payment.name}\nPayment Mode\t${payment.payment_mode || "N/A"}`);
        });
    
        // Add the customer informatios
        if (order.partner) {
            addBlock('CMD_PARTNER', `Partner Name\t${order.partner.name}\nPhone\t${order.partner.phone || "N/A"}\nCountry\t${order.partner.country || "N/A"}\nVAT\t${order.partner.vat || "N/A"}\nAddress\t${order.partner.street || "N/A"}, ${order.partner.city || "N/A"}, ${order.partner.zip || "N/A"}`);
        }
        
        // Add used currency
        addBlock('CMD_ORDER', `Currency\t${ order.pos.currency.name }`);
    
        return formattedOrder.join('\n');
    },
    
    createOrderTxtFile(order) {
        const data = this.formatOrderData(order);
        const blob = new Blob([data], { type: 'text/plain' });
        saveAs(blob, `${order.name}.txt`);
    },
    

    // Override POS validateOrder method
    async validateOrder(isForceValidate) {
        await super.validateOrder(...arguments);
        const order = this.pos.get_order(); 
        let auto_download_receipt = false   

        try {
            const params = await this.pos.env.services.rpc('/fiscal_cash_register/auto_download_receipt')
            console.log(params);
            auto_download_receipt = params.auto_download_receipt;
        } catch (error) {
            console.log(error);
            auto_download_receipt = false
        }

        console.log(order);

        //FIXME: fix onchange on auto_download_receipt
        // if (auto_download_receipt){
            this.createOrderTxtFile(order);
        // }
    }


});

