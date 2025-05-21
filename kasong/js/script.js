// Initialize AOS
AOS.init({
    duration: 800,
    once: true
});

// Loading State
const loadingOverlay = document.getElementById('loading');
function showLoading() {
    loadingOverlay.classList.add('active');
}
function hideLoading() {
    loadingOverlay.classList.remove('active');
}

// Form Section Animation Observer
const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.form-section').forEach(section => {
    sectionObserver.observe(section);
});

// --- PIN MODAL LOGIC ---
// --- PIN MODAL LOGIC ---
const pinModalEl = document.getElementById('pinModal');
const pinModalInstance = new bootstrap.Modal(pinModalEl);
const openPinModalBtn = document.getElementById('openPinModalBtn');
const verifyPinBtn = document.getElementById('verifyPinBtn');
const cancelPinBtn = document.getElementById('cancelPinBtn'); // Added cancel button
const pinInputEl = document.getElementById('pinInput');
const shopNameDisplayEl = document.getElementById('shopNameDisplay');
const verifiedShopPinInputEl = document.getElementById('verifiedShopPin');
const pinInvalidFeedbackEl = document.getElementById('pinInvalidFeedback');

let isPinVerifiedGlobally = false;

// Function to toggle form controls' disabled state
function toggleFormControls(enable) {
    const formControls = [
        document.getElementById('deliveryMethod'),
        document.getElementById('paymentMethod'),
        document.getElementById('numFertilizers'),
        document.getElementById('orderNotes'),
        document.querySelector('#fertilizerOrderForm button[type="submit"]')
    ];
    const fertilizerContainer = document.getElementById('fertilizerRowsContainer');

    formControls.forEach(control => {
        if (control) {
            control.disabled = !enable;
        }
    });

    if (fertilizerContainer) {
        const inputsAndSelects = fertilizerContainer.querySelectorAll('input, select');
        inputsAndSelects.forEach(el => el.disabled = !enable);
    }
    calculateTotals();
}

openPinModalBtn.addEventListener('click', () => {
    pinInputEl.value = '';
    pinInputEl.classList.remove('is-invalid');
    pinInvalidFeedbackEl.textContent = 'กรุณากรอกรหัส PIN 4 หลักให้ถูกต้อง'; // Reset feedback
    pinModalInstance.show();
});

pinModalEl.addEventListener('shown.bs.modal', () => {
    pinInputEl.focus();
});

cancelPinBtn.addEventListener('click', () => {
    if (!isPinVerifiedGlobally) {
        shopNameDisplayEl.value = '';
        verifiedShopPinInputEl.value = '';
        toggleFormControls(false); // Lock form if PIN was never verified
    }
    pinModalInstance.hide();
});

verifyPinBtn.addEventListener('click', () => {
    const pin = pinInputEl.value.trim();
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        pinInputEl.classList.add('is-invalid');
        pinInvalidFeedbackEl.textContent = "รหัส PIN ต้องเป็นตัวเลข 4 หลักเท่านั้น";
        return;
    }
    pinInputEl.classList.remove('is-invalid');

    google.script.run
        .withSuccessHandler(shopName => {
            if (shopName?.startsWith("ERROR_")) {
                handlePinError("เกิดข้อผิดพลาดในการดึงข้อมูล");
            } else if (shopName) {
                shopNameDisplayEl.value = shopName;
                verifiedShopPinInputEl.value = pin;
                isPinVerifiedGlobally = true;
                pinModalInstance.hide();
                toggleFormControls(true); // Unlock form
                alert(`ยินดีต้อนรับ: ร้าน ${shopName}`);
            }
        })
        .withFailureHandler(error => {
            handlePinError("เกิดข้อผิดพลาด: " + error.message);
            toggleFormControls(false); // Keep form locked
        })
        .getShopByPin(pin);
});

function handlePinError(message) {
    pinInputEl.value = ''; // รีเซ็ตอินพุต PIN
    pinInputEl.classList.add('is-invalid');
    pinInvalidFeedbackEl.textContent = message || "เกิดข้อผิดพลาดในการตรวจสอบ PIN กรุณาลองใหม่";
    isPinVerifiedGlobally = false;
    toggleFormControls(false); // Ensure form remains locked
    pinInputEl.focus(); // โฟกัสที่อินพุต PIN
}

// --- FERTILIZER DATA AND DYNAMIC ROWS LOGIC ---
let brandsList = []; // To store fetched brands

function fetchInitialData() {
    showLoading();
    google.script.run
        .withSuccessHandler(fetchedBrands => {
            brandsList = fetchedBrands || [];
            hideLoading();
        })
        .withFailureHandler(error => {
            console.error("Error fetching brands:", error);
            alert("เกิดข้อผิดพลาดในการโหลดข้อมูลยี่ห้อปุ๋ย: " + error.message);
            hideLoading();
        })
        .getBrands();
}

const fertilizerRowsContainer = document.getElementById('fertilizerRowsContainer');

function generateFertilizerFields() {
    const numFertilizersInput = document.getElementById("numFertilizers");
    const num = parseInt(numFertilizersInput.value);
    fertilizerRowsContainer.innerHTML = ""; // Clear previous

    if (isNaN(num) || num < 1 || num > 8) {
        if (numFertilizersInput.value !== "" && (isNaN(num) || num < 1 || num > 8)) {
            alert("กรุณาระบุจำนวนสูตรปุ๋ยระหว่าง 1 ถึง 8 สูตร");
        }
        calculateTotals(); // Recalculate if rows are cleared
        return;
    }

    for (let i = 1; i <= num; i++) {
        const sectionDiv = document.createElement('div');
        sectionDiv.classList.add('form-section', 'border', 'p-3', 'rounded', 'mb-3');

        const rowHTML = `
            <h6 class="mb-3">รายละเอียดปุ๋ยสูตรที่ ${i}</h6>
            <div class="row g-3">
                <div class="col-md-4">
                    <label for="brand${i}" class="form-label">ยี่ห้อปุ๋ย</label>
                    <select class="form-select brand-select" id="brand${i}" name="ยี่ห้อ${i}" data-index="${i}" required>
                        <option value="" selected disabled>🔸 เลือกยี่ห้อ 🔸</option>
                        ${brandsList.map(brand => `<option value="${brand}">${brand}</option>`).join("")}
                    </select>
                </div>
                <div class="col-md-4">
                    <label for="formula${i}" class="form-label">สูตรปุ๋ย</label>
                    <select class="form-select formula-select" id="formula${i}" name="สูตรปุ๋ย${i}" data-index="${i}" required>
                        <option value="" selected disabled>🔸 เลือกสูตร (เลือกยี่ห้อก่อน) 🔸</option>
                    </select>
                </div>
                <div class="col-md-2 col-6">
                    <label for="quantity${i}" class="form-label fertilizer-item-label-small" style="font-size: calc(1rem + 2px);">จำนวน (กส.)</label>
                    <input type="number" class="form-control quantity-input" id="quantity${i}" name="จำนวน${i}" data-index="${i}" min="1" required placeholder="0">
                </div>
                <div class="col-md-2 col-6">
                    <label class="form-label fertilizer-item-label-small">ยอดรวมสูตรนี้</label>
                    <div class="fw-bold text-success pt-2 item-total-display" id="itemTotalDisplay${i}">0 บาท</div>
                    <input type="hidden" name="ยอดชำระ${i}" id="itemTotalInput${i}">
                </div>
            </div>
        `;
        sectionDiv.innerHTML = rowHTML;
        fertilizerRowsContainer.appendChild(sectionDiv);
    }
    attachEventListenersToFertilizerRows();
    calculateTotals();
}

function attachEventListenersToFertilizerRows() {
    document.querySelectorAll('.brand-select').forEach(select => {
        select.addEventListener('change', handleBrandChange);
    });
    document.querySelectorAll('.formula-select, .quantity-input').forEach(input => {
        input.addEventListener('change', calculateItemTotalAndGrandTotal);
        if (input.type === 'number') {
            input.addEventListener('input', calculateItemTotalAndGrandTotal);
        }
    });
}

function handleBrandChange(event) {
    const index = event.target.dataset.index;
    const selectedBrand = event.target.value;
    const formulaSelect = document.getElementById(`formula${index}`);

    formulaSelect.innerHTML = `<option value="" selected disabled>กำลังโหลดสูตร...</option>`;
    formulaSelect.disabled = true;

    if (!selectedBrand) {
        formulaSelect.innerHTML = `<option value="" selected disabled>🔸 เลือกสูตร (เลือกยี่ห้อก่อน) 🔸</option>`;
        formulaSelect.disabled = false;
        calculateTotals();
        return;
    }

    google.script.run
        .withSuccessHandler(fertilizerFormulas => {
            formulaSelect.innerHTML = `<option value="" selected disabled>🔸 เลือกสูตรปุ๋ย 🔸</option>`;
            if (fertilizerFormulas && fertilizerFormulas.length > 0) {
                fertilizerFormulas.forEach(formula => {
                    const option = document.createElement("option");
                    option.value = formula.name;
                    option.dataset.price = formula.price;
                    option.textContent = `${formula.name} (${parseInt(formula.price).toLocaleString()} บาท/กส.)`;
                    formulaSelect.appendChild(option);
                });
            } else {
                formulaSelect.innerHTML = `<option value="" selected disabled>ไม่พบสูตรสำหรับยี่ห้อนี้</option>`;
            }
            formulaSelect.disabled = false;
            calculateTotals(); // Recalculate totals after formulas are loaded
        })
        .withFailureHandler(error => {
            console.error("Error fetching formulas for brand:", selectedBrand, error);
            formulaSelect.innerHTML = `<option value="" selected disabled>โหลดสูตรไม่สำเร็จ</option>`;
            formulaSelect.disabled = false;
            calculateTotals();
        })
        .getFertilizerData(selectedBrand);
}

function calculateItemTotalAndGrandTotal(event) {
    const index = event.target.dataset.index;
    calculateItemTotal(index);
    calculateTotals();
}

function calculateItemTotal(index) {
    const formulaSelect = document.getElementById(`formula${index}`);
    const quantityInput = document.getElementById(`quantity${index}`);
    const itemTotalDisplay = document.getElementById(`itemTotalDisplay${index}`);
    const itemTotalInput = document.getElementById(`itemTotalInput${index}`);

    const selectedOption = formulaSelect ? formulaSelect.options[formulaSelect.selectedIndex] : null;
    const pricePerBag = selectedOption && selectedOption.dataset.price ? parseFloat(selectedOption.dataset.price) : 0;
    const quantity = quantityInput ? parseFloat(quantityInput.value) : 0;

    let total = 0;
    if (!isNaN(pricePerBag) && !isNaN(quantity) && quantity > 0) {
        total = pricePerBag * quantity;
    }

    itemTotalDisplay.textContent = `${total.toLocaleString()} บาท`;
    itemTotalInput.value = total;
}

function calculateTotals() {
    let grandTotal = 0;
    let totalQuantity = 0;
    const numFertilizers = parseInt(document.getElementById("numFertilizers").value) || 0;

    for (let i = 1; i <= numFertilizers; i++) {
        const itemTotalInput = document.getElementById(`itemTotalInput${i}`);
        const quantityInput = document.getElementById(`quantity${i}`);

        if (itemTotalInput && quantityInput) {
            grandTotal += parseFloat(itemTotalInput.value) || 0;
            totalQuantity += parseFloat(quantityInput.value) || 0;
        }
    }

    document.getElementById("grandTotalDisplay").textContent = `${grandTotal.toLocaleString()} บาท`;
    document.getElementById("grandTotalInput").value = grandTotal;
    document.getElementById("totalQuantityDisplay").textContent = `${totalQuantity.toLocaleString()} กระสอบ`;
    document.getElementById("totalQuantityInput").value = totalQuantity;
}

// --- FORM SUBMISSION LOGIC ---
const formElement = document.getElementById('fertilizerOrderForm');
const summaryModalInstance = new bootstrap.Modal(document.getElementById('summaryModal'));
let isSubmitting = false; // เพิ่มตัวแปรสำหรับตรวจสอบสถานะการส่ง

function handleFormSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    // ตรวจสอบ PIN
    if (!isPinVerifiedGlobally || !shopNameDisplayEl.value) {
        alert("กรุณากรอกและยืนยันรหัส PIN ร้านค้าให้ถูกต้องก่อนครับ/ค่ะ");
        openPinModalBtn.focus();
        return;
    }

    // ตรวจสอบจำนวนสูตรปุ๋ย
    const numFertilizers = parseInt(document.getElementById("numFertilizers").value, 10);
    if (isNaN(numFertilizers) || numFertilizers < 1) {
        alert("กรุณาระบุจำนวนสูตรปุ๋ยและกรอกรายละเอียดอย่างน้อย 1 สูตรครับ/ค่ะ");
        document.getElementById("numFertilizers").focus();
        return;
    }

    // Proceed to show summary modal
    showSummaryModal();
}

function showSummaryModal() {
    // Populate Summary Modal
    document.getElementById("modalShopName").textContent = shopNameDisplayEl.value;
    document.getElementById("modalDeliveryMethod").textContent = document.getElementById('deliveryMethod').value;
    document.getElementById("modalPaymentMethod").textContent = document.getElementById('paymentMethod').value;

    const notesValue = document.getElementById('orderNotes').value.trim();
    const modalNotesP = document.getElementById('modalOrderNotesP');
    const modalNotesSpan = document.getElementById('modalOrderNotes');

    if (notesValue) {
        modalNotesSpan.textContent = notesValue;
        modalNotesP.style.display = 'block';
    } else {
        modalNotesSpan.textContent = '-';
        modalNotesP.style.display = 'none';
    }

    // Clear previous details
    const modalFertilizerDetails = document.getElementById("modalFertilizerDetails");
    modalFertilizerDetails.innerHTML = ''; // ล้างข้อมูลเก่า

    const numFertilizers = parseInt(document.getElementById("numFertilizers").value, 10);
    let currentModalGrandTotal = 0;
    let currentModalTotalQuantity = 0;

    for (let i = 1; i <= numFertilizers; i++) {
        const brand = document.getElementById(`brand${i}`).value;
        const formulaSelect = document.getElementById(`formula${i}`);
        const formulaName = formulaSelect.value;
        const quantity = parseInt(document.getElementById(`quantity${i}`).value);
        const itemTotal = parseFloat(document.getElementById(`itemTotalInput${i}`).value);

        currentModalGrandTotal += itemTotal;
        currentModalTotalQuantity += quantity;

        const detailDiv = document.createElement('div');
        detailDiv.classList.add('mb-2', 'pb-2', 'border-bottom');
        detailDiv.innerHTML = `
            <p class="mb-1"><strong>รายการที่ ${i}:</strong> ${brand} - ${formulaName}</p>
            <ul class="list-unstyled ms-3 mb-0">
                <li>จำนวน: ${quantity.toLocaleString()} กระสอบ</li>
                <li>ยอดรวมสูตรนี้: ${itemTotal.toLocaleString()} บาท</li>
            </ul>`;
        modalFertilizerDetails.appendChild(detailDiv);
    }

    document.getElementById("modalTotalQuantity").textContent = currentModalTotalQuantity.toLocaleString();
    document.getElementById("modalGrandTotal").textContent = currentModalGrandTotal.toLocaleString();

    // Show the modal
    summaryModalInstance.show();
}

const confirmOrderBtn = document.getElementById('confirmOrderBtn');
confirmOrderBtn.addEventListener('click', function() {
    if (isSubmitting) {
        return; // ถ้ากำลังส่งอยู่ ให้ไม่ทำอะไร
    }
    
    isSubmitting = true;
    this.disabled = true;
    this.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> กำลังส่ง...`;
    showLoading();

    try {
        const dataObject = {};
        dataObject['ชื่อร้าน'] = shopNameDisplayEl.value;
        dataObject['verifiedShopPin'] = verifiedShopPinInputEl.value;
        dataObject['ช่องทางการรับปุ๋ย'] = document.getElementById('deliveryMethod').value;
        dataObject['วิธีการชำระเงิน'] = document.getElementById('paymentMethod').value;
        dataObject['หมายเหตุ'] = document.getElementById('orderNotes').value || '-';

        const numFertilizers = parseInt(document.getElementById("numFertilizers").value, 10);
        for (let i = 1; i <= numFertilizers; i++) {
            if (document.getElementById(`brand${i}`)) {
                dataObject[`ยี่ห้อ${i}`] = document.getElementById(`brand${i}`).value;
                dataObject[`สูตรปุ๋ย${i}`] = document.getElementById(`formula${i}`).value;
                dataObject[`จำนวน${i}`] = document.getElementById(`quantity${i}`).value;
            }
        }

        google.script.run
            .withSuccessHandler(function(response) {
                alert("✅ บันทึกคำสั่งซื้อสำเร็จ");
                summaryModalInstance.hide();
                formElement.reset();
                fertilizerRowsContainer.innerHTML = "";
                shopNameDisplayEl.value = "";
                verifiedShopPinInputEl.value = "";
                isPinVerifiedGlobally = false;
                calculateTotals();
                toggleFormControls(false); // Lock form on reset
                
                // ซ่อนตัวเลือกการชำระเงินปลายทาง
                document.getElementById('codSubOptions').style.display = 'none';
                
                // รีเซ็ตสถานะปุ่มหลังจาก 3 วินาที
                setTimeout(() => {
                    isSubmitting = false;
                    confirmOrderBtn.disabled = false;
                    confirmOrderBtn.innerHTML = '<i class="bi bi-send-check-fill"></i> ยืนยันและส่งคำสั่งซื้อ';
                    hideLoading();
                }, 3000);
            })
            .withFailureHandler(function(error) {
                alert("❌ เกิดข้อผิดพลาด: " + (error.message || "ไม่สามารถบันทึกข้อมูลได้"));
                
                // รีเซ็ตสถานะปุ่มหลังจาก 3 วินาที
                setTimeout(() => {
                    isSubmitting = false;
                    confirmOrderBtn.disabled = false;
                    confirmOrderBtn.innerHTML = '<i class="bi bi-send-check-fill"></i> ยืนยันและส่งคำสั่งซื้อ';
                    hideLoading();
                }, 3000);
            })
            .processForm(dataObject);
    } catch (e) {
        alert("❌ เกิดข้อผิดพลาดในการเตรียมข้อมูล: " + e.message);
        
        // รีเซ็ตสถานะปุ่มหลังจาก 3 วินาที
        setTimeout(() => {
            isSubmitting = false;
            confirmOrderBtn.disabled = false;
            confirmOrderBtn.innerHTML = '<i class="bi bi-send-check-fill"></i> ยืนยันและส่งคำสั่งซื้อ';
            hideLoading();
        }, 3000);
    }
});

// --- INITIALIZATION ---
fetchInitialData(); // Fetch brands on page load
calculateTotals(); // Initialize totals to 0
toggleFormControls(false); // Initially disable form controls