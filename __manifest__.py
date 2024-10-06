# -*- coding: utf-8 -*-
{
    'name': "Fiscal Cash Register",
    'summary': "Short (1 phrase/line) summary of the module's purpose",
    'author': "Leonel Kenfack",
    'website': "https://www.linkedin.com/in/realleonelkenfack/",
    'category': 'Point of Sale',
    'version': '0.1',
    'depends': ['point_of_sale'],
    'data': [
        'views/pos_config_view.xml',
    ],
    'assets': {
        'point_of_sale.assets_prod': [
            'fiscal_cash_register/static/src/js/payment_screen.js',
        ],
    },
    'installable': True,
    'application': False,
}

