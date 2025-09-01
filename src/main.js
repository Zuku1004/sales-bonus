/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // Рассчитываем коэффициент скидки: (100% - discount%) / 100
    const discountDecimal = 1 - (purchase.discount / 100);
    
    // Вычисляем выручку: цена продажи * количество * коэффициент скидки
    return purchase.sale_price * purchase.quantity * discountDecimal;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // Первое место - 15% от прибыли
    if (index === 0) {
        return seller.profit * 0.15;
    } 
    // Второе и третье место - 10% от прибыли
    else if (index === 1 || index === 2) {
        return seller.profit * 0.10;
    } 
    // Последнее место - 0%
    else if (index === total - 1) {
        return 0;
    } 
    // Все остальные - 5% от прибыли
    else {
        return seller.profit * 0.05;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  const { calculateRevenue, calculateBonus } = options;
  // ===== ПОДГОТОВКА ПРОМЕЖУТОЧНЫХ ДАННЫХ ДЛЯ СБОРА СТАТИСТИКИ =====
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,          // Общая выручка
        profit: 0,           // Общая прибыль
        sales_count: 0,      // Количество продаж
        products_sold: {}    // Объект для учета проданных товаров: {sku: quantity}
    }));
    // @TODO: Проверка входных данных
    if (!data
    || !Array.isArray(data.sellers)
    || data.sellers.length === 0 
    || !Array.isArray(data.products)
    || data.products.length === 0
    || !Array.isArray(data.customers)
    || data.customers.length === 0
    || !Array.isArray(data.purchase_records)
    || data.purchase_records.length === 0
) {
    throw new Error('Некорректные входные данные');
} 

    // @TODO: Проверка наличия опций
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Опции должны содержать функции calculateRevenue и calculateBonus');
    }

    // @TODO: Подготовка промежуточных данных для сбора статистики

    // @TODO: Индексация продавцов и товаров для быстрого доступа
   const sellerIndex = sellerStats.reduce((acc, seller) => {
        acc[seller.id] = seller;
        return acc;
    }, {});

    // Создаем индекс товаров для быстрого доступа по SKU
    const productIndex = data.products.reduce((acc, product) => {
        acc[product.sku] = product;
        return acc;
    }, {});
    // @TODO: Расчет выручки и прибыли для каждого продавца
data.purchase_records.forEach(record => { // Чек 
        const seller = sellerIndex[record.seller_id]; // Продавец
        // Увеличить количество продаж 
        seller.sales_count += 1;
        // Увеличить общую сумму всех продаж
        seller.revenue += record.total_amount;
        // Расчёт прибыли для каждого товара
        record.items.forEach(item => {
            const product = productIndex[item.sku]; // Товар
            // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
            const cost = product.purchase_price * item.quantity;
            // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
            const revenue = calculateRevenue(item, product);
            // Посчитать прибыль: выручка минус себестоимость
            const profit = revenue - cost;
        // Увеличить общую накопленную прибыль (profit) у продавца  
            seller.profit += profit;
            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            // По артикулу товара увеличить его проданное количество у продавца
            seller.products_sold[item.sku] += item.quantity;
        });
 });
    // @TODO: Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // @TODO: Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        // Расчет бонуса на основе позиции в рейтинге
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        
        // Формирование топ-10 товаров продавца
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });
    // @TODO: Подготовка итоговой коллекции с нужными полями
     return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),        // Округляем до 2 знаков после запятой
        profit: +seller.profit.toFixed(2),          // Округляем до 2 знаков после запятой
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)             // Округляем до 2 знаков после запятой
    }));
}
