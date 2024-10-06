from odoo import fields, models, api

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    auto_download_receipt = fields.Boolean(string='Auto Download Receipt', default=False)

    @api.onchange("auto_download_receipt")
    def set_download_receipt(self):
        self.env['ir.config_parameter'].sudo().set_param('fiscal_cash_register.auto_download_receipt', self.auto_download_receipt)