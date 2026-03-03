import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Order, OrderItem } from '@/types/cashier';

interface OrderTicketProps {
    order: Order | null;
    type: 'kitchen' | 'bar' | 'customer';
    restaurantName?: string;
}

export const OrderTicket: React.FC<OrderTicketProps> = ({ order, type, restaurantName }) => {
    if (!order) return null;

    // Use a portal to render directly into document.body
    // This avoids nesting issues and allows us to hide #root safely
    const mountNode = document.body;

    const isDrink = (item: OrderItem) => {
        const category = item.category_name?.toLowerCase() || '';
        return category.includes('bebida') ||
            category.includes('drink') ||
            category.includes('suco') ||
            category.includes('refrigerante') ||
            category.includes('água') ||
            category.includes('cerveja');
    };

    const filterItems = () => {
        switch (type) {
            case 'kitchen':
                return order.items.filter(item => {
                    // Start with database configuration
                    const shouldSend = item.category_send_to_kitchen !== false;

                    // If explicitly allowed by DB, send it. 
                    // (We no longer filter out 'drinks' by name if DB says send to kitchen)
                    return shouldSend;
                });
            case 'bar':
                return order.items.filter(item => {
                    const isDrinkItem = isDrink(item);
                    const shouldSendToKitchen = item.category_send_to_kitchen !== false;

                    // Show in bar if:
                    // 1. It IS a drink (legacy check, safe to keep for bar)
                    // 2. OR it is explicitly marked NOT to go to kitchen (e.g. desserts, salads served from bar area)
                    return isDrinkItem || !shouldSendToKitchen;
                });
            default:
                return order.items;
        }
    };

    const itemsToPrint = filterItems();

    if (itemsToPrint.length === 0) return null;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const getTitle = () => {
        switch (type) {
            case 'kitchen': return 'COZINHA';
            case 'bar': return 'BAR / COPA';
            case 'customer': return null; // No title for customer
        }
    };

    const title = getTitle();

    // Financials
    const subtotal = order.subtotal || order.total;
    const discount = order.discount || 0;
    const deliveryFee = order.delivery_fee || 0;
    const couvert = order.couvert || 0;
    const serviceFee = order.service_fee || 0;

    return createPortal(
        <div className="print-ticket-container">
            <div className="print-content p-4 text-black bg-white" style={{ width: '80mm', maxWidth: '100%', margin: '0 auto', fontFamily: 'monospace' }}>
                {/* Header */}
                <div className="text-center border-b border-dashed border-black pb-2 mb-2">
                    {type === 'customer' && restaurantName && (
                        <h2 className="text-lg font-bold uppercase mb-1">{restaurantName}</h2>
                    )}

                    {title && <h2 className="text-xl font-bold uppercase">{title}</h2>}

                    <div className="text-sm">
                        <div className="flex justify-between items-center px-4">
                            <span className="font-bold text-lg">SENHA: {order.order_number}</span>
                        </div>
                        <p className="text-xs mt-1">{new Date().toLocaleString('pt-BR')}</p>

                        {type === 'customer' && order.order_type !== 'delivery' && (
                            <div className="mt-2 text-left text-xs border-t border-dotted border-black pt-1">
                                {order.customer_name && <p><strong>Cliente:</strong> {order.customer_name}</p>}
                                {order.order_type === 'table' && <p><strong>Mesa:</strong> {order.table_number || order.table_id}</p>}
                            </div>
                        )}

                        {/* Delivery Info - Show for all types if it's delivery */}
                        {order.order_type === 'delivery' && (
                            <div className="mt-2 text-left text-xs border-t border-dotted border-black pt-1">
                                <p className="text-center font-bold uppercase mb-1 border-b border-black pb-1">Delivery</p>
                                {order.customer_name && <p><strong>Cliente:</strong> {order.customer_name}</p>}
                                {order.delivery_address && <p><strong>Endereço:</strong> {order.delivery_address}</p>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Items */}
                <div className="space-y-1 text-sm border-b border-dashed border-black pb-2 mb-2">
                    {itemsToPrint.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="flex justify-between items-start">
                            <div className="flex-1">
                                <span className="font-bold">{item.quantity}x</span> {item.product_name}
                            </div>
                            {type === 'customer' && (
                                <span className="ml-2">{formatCurrency(item.total_price)}</span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Financials (Customer Only) */}
                {type === 'customer' && (
                    <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                            <span>Valor dos Produtos:</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between">
                                <span>Descontos:</span>
                                <span>-{formatCurrency(discount)}</span>
                            </div>
                        )}
                        {deliveryFee > 0 && (
                            <div className="flex justify-between">
                                <span>Taxa de Entrega:</span>
                                <span>{formatCurrency(deliveryFee)}</span>
                            </div>
                        )}
                        {couvert > 0 && (
                            <div className="flex justify-between">
                                <span>Couvert:</span>
                                <span>{formatCurrency(couvert)}</span>
                            </div>
                        )}
                        {serviceFee > 0 && (
                            <div className="flex justify-between">
                                <span>Taxa de Serviço:</span>
                                <span>{formatCurrency(serviceFee)}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center text-lg font-bold border-t border-dashed border-black pt-2 mt-2">
                            <span>TOTAL:</span>
                            <span>{formatCurrency(order.total)}</span>
                        </div>
                    </div>
                )}

                {/* Observations */}
                {order.notes && (
                    <div className="mt-4 pt-2 border-t border-black text-sm">
                        <p className="font-bold">Observações:</p>
                        <p>{order.notes}</p>
                    </div>
                )}

                <div className="text-center text-xs mt-8 pb-8">
                    <p>*** Documento sem validade Fiscal ***</p>
                </div>
            </div>

            <style>{`
        /* Hide locally on screen */
        .print-ticket-container {
          display: none;
        }

        @media print {
          /* Hide main app */
          #root, #sidebar-wrapper, .radix-themes {
            display: none !important;
          }

          /* Show print container */
          .print-ticket-container {
            display: block !important;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            z-index: 99999;
          }

          /* Reset body settings that might interfere */
          body {
            background: white;
            margin: 0;
            padding: 0;
            visibility: visible !important;
            overflow: visible !important;
          }

          @page {
            margin: 0;
            size: auto;
          }

          /* Ensure content visibility */
          .print-content, .print-content * {
            visibility: visible !important;
            color: black !important;
          }
        }
      `}</style>
        </div>,
        mountNode
    );
};
