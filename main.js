document.addEventListener('DOMContentLoaded', function() {
    // 平滑滾動到指定 CSS Selector 的區塊
    function scrollToSelector(selector) {
        const el = document.querySelector(selector);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    /**
     * 開啟新分頁連結
     * @param {string} url 要打開的 URL
     */
    function openLinkUrl(url) {
        window.open(url, '_blank', 'noopener');
    }

    // DOM元素
    const imageUpload = document.getElementById('imageUpload');
    const uploadedImage = document.getElementById('uploadedImage');
    const imageContainer = document.getElementById('imageContainer');
    const selectionsContainer = document.getElementById('selectionsContainer');
    const placeholderText = document.getElementById('placeholderText');
    const selectionsList = document.getElementById('selectionsList');
    const noSelectionsText = document.getElementById('noSelectionsText');
    const outputResult = document.getElementById('outputResult');
    const rectangleBtn = document.getElementById('rectangleBtn');
    const circleBtn = document.getElementById('circleBtn');
    const polygonBtn = document.getElementById('polygonBtn');
    const finishBtn = document.getElementById('finishBtn');
    const resetBtn = document.getElementById('resetBtn');
    const previewBtn = document.getElementById('previewBtn');
    const maximizeBtn = document.getElementById('maximizeBtn');
    const previewContainer = document.getElementById('previewContainer');
    const previewImage = document.getElementById('previewImage');
    const previewSelections = document.getElementById('previewSelections');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const copyFullCodeBtn = document.getElementById('copyFullCodeBtn');
    const copyFullCodeNoBase64Btn = document.getElementById('copyFullCodeNoBase64Btn');

    // 狀態變量
    let isDrawing = false;
    let startX, startY;
    let currentShape = 'rectangle'; // 默認形狀為矩形
    let selections = [];
    let selectedElement = null;
    let isResizing = false;
    let resizeHandle = null;
    let originalWidth, originalHeight;
    let originalLeft, originalTop;
    let aspectRatio = 1;
    let imageWidth, imageHeight;

    // 多邊形繪製相關變量
    let isDrawingPolygon = false;
    let polygonPoints = [];
    let currentPolygonElement = null;
    let temporaryLine = null;
    let polygonHint = null;

    // 在全局變量區域添加新變量
    let firstPointHighlight = null;
    let isNearFirstPoint = false;
    let isShowingCloseConfirm = false;
    const CLOSE_DISTANCE_THRESHOLD = 15; // 像素距離，判定為接近第一個點的閾值

    // 用於生成唯一選區 ID：格式 selection-YYYYMMDDHHMMSS
    function generateSelectionId() {
        const now = new Date();
        const pad = n => n.toString().padStart(2,'0');
        return 'selection-' + now.getFullYear()
            + pad(now.getMonth()+1) + pad(now.getDate())
            + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
    }

    // 添加編輯說明的函數
    function editDescriptionInternal(element) {
        const selectionId = element.id;
        const selection = selections.find(s => s.id === selectionId);
        const currentDescription = selection.description || '';

        const description = prompt('請輸入此區域Alt的說明：', currentDescription);
        if (description !== null) {
            selection.description = description;
            element.setAttribute('data-description', description);
            updateSelectionsList();
            updateOutputResult();
        }
    }

    // 添加編輯 ID 的函數
    function editIdInternal(element) {
        const selectionId = element.id;
        const selection = selections.find(s => s.id === selectionId);
        const currentId = selection.name;

        const newId = prompt('請輸入新的 ID 名稱：', currentId);
        if (newId !== null && newId.trim() !== '' && newId.trim() !== currentId) {
            const trimmedId = newId.trim();

            // 檢查ID是否包含空格或特殊字符
            if (/[\s\(\)\[\]\{\}\<\>\,\.\/\\\?\;\:\'\"\!\@\#\$\%\^\&\*\=\+\`\~]/.test(trimmedId)) {
                alert("ID不能包含空格或特殊字符，只能使用字母、數字、連字符和下劃線。");
                return;
            }

            // 更新選區物件中的名稱
            selection.name = trimmedId;

            // 更新顯示標籤的文字
            const label = element.querySelector('.selection-label');
            if (label) {
                label.textContent = trimmedId;
            }

            // 更新選區列表和輸出結果
            updateSelectionsList();
            updateOutputResult();
        }
    }

    // 高亮列表項，color 可為 'green' 或 'yellow'
    function highlightListItem(id, color = 'green') {
        document.querySelectorAll('.selection-item').forEach(el => {
            el.classList.remove('border-2','rounded-lg','border-green-500','border-yellow-500');
        });
        const listEl = document.getElementById('list-' + id);
        if (listEl) {
            listEl.classList.add('border-2','rounded-lg', `border-${color}-500`);
        }
    }

    // 暴露給全局的編輯說明函數
    window.editDescription = function(elementId) {
        highlightListItem(elementId, 'yellow');
        const element = document.getElementById(elementId);
        if (element) {
            editDescriptionInternal(element);
        }
    };

    // 暴露給全局的編輯 ID 函數
    window.editId = function(elementId) {
        highlightListItem(elementId, 'green');
        const element = document.getElementById(elementId);
        if (element) {
            editIdInternal(element);
        }
    };

    // 監聽圖片上傳
    imageUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();

            reader.onload = function(e) {
                uploadedImage.src = e.target.result;
                uploadedImage.classList.remove('hidden');
                placeholderText.classList.add('hidden');

                // 重置選擇區域
                selectionsContainer.innerHTML = '';
                selections = [];
                updateSelectionsList();

                // 獲取圖片自然尺寸
                uploadedImage.onload = function() {
                    imageWidth = uploadedImage.naturalWidth;
                    imageHeight = uploadedImage.naturalHeight;
                    aspectRatio = imageWidth / imageHeight;
                    updateOutputResult();
                };
            };

            reader.readAsDataURL(file);
        }
    });

    // 切換形狀按鈕
    rectangleBtn.addEventListener('click', function() {
        currentShape = 'rectangle';

        // 更新按鈕樣式
        rectangleBtn.classList.remove('bg-gray-400');
        rectangleBtn.classList.add('bg-purple-500', 'active');

        circleBtn.classList.remove('bg-purple-500', 'active');
        circleBtn.classList.add('bg-gray-400');

        polygonBtn.classList.remove('bg-purple-500', 'active');
        polygonBtn.classList.add('bg-gray-400');

        resetPolygonDrawing();

        // 隱藏多邊形提示
        if (polygonHint) {
            polygonHint.style.display = 'none';
        }

        // 移除多邊形模式指示
        imageContainer.classList.remove('polygon-active');
    });

    circleBtn.addEventListener('click', function() {
        currentShape = 'circle';

        // 更新按鈕樣式
        circleBtn.classList.remove('bg-gray-400');
        circleBtn.classList.add('bg-purple-500', 'active');

        rectangleBtn.classList.remove('bg-purple-500', 'active');
        rectangleBtn.classList.add('bg-gray-400');

        polygonBtn.classList.remove('bg-purple-500', 'active');
        polygonBtn.classList.add('bg-gray-400');

        resetPolygonDrawing();

        // 隱藏多邊形提示
        if (polygonHint) {
            polygonHint.style.display = 'none';
        }

        // 移除多邊形模式指示
        imageContainer.classList.remove('polygon-active');
    });

    polygonBtn.addEventListener('click', function() {
        currentShape = 'polygon';

        // 更新按鈕樣式
        polygonBtn.classList.remove('bg-gray-400');
        polygonBtn.classList.add('bg-purple-500', 'active');

        rectangleBtn.classList.remove('bg-purple-500', 'active');
        rectangleBtn.classList.add('bg-gray-400');

        circleBtn.classList.remove('bg-purple-500', 'active');
        circleBtn.classList.add('bg-gray-400');

        resetPolygonDrawing();

        // 添加多邊形繪製提示
        if (!polygonHint) {
            polygonHint = document.createElement('div');
            polygonHint.className = 'polygon-drawing-hint';
            document.body.appendChild(polygonHint);
        }

        polygonHint.innerHTML = `
            <strong>不規則選區繪製:</strong><br>
            1. 點擊圖片上的點來創建多邊形頂點<br>
            2. 每次點擊添加一個點（至少需要3個點）<br>
            3. 點擊靠近起始點的位置可閉合多邊形<br>
            4. 50個點後會自動閉合
        `;

        polygonHint.style.display = 'block';

        // 添加多邊形模式指示
        imageContainer.classList.add('polygon-active');
    });

    // 完成按鈕
    finishBtn.addEventListener('click', function() {
        if (selections.length === 0) {
            alert('請先創建至少一個選區');
            return;
        }

        const { htmlCode, jsCode } = generateSelectionCode();
        outputResult.textContent = htmlCode + jsCode;
        outputResult.parentElement.classList.remove('hidden');

        // 滾動到代碼區域
        outputResult.parentElement.scrollIntoView({ behavior: 'smooth' });
    });

    // 重置按鈕
    resetBtn.addEventListener('click', function() {
        selectionsContainer.innerHTML = '';
        selections = [];
        updateSelectionsList();
        updateOutputResult();
    });

    // 複製代碼按鈕
    copyCodeBtn.addEventListener('click', function() {
        if (selections.length === 0) {
            alert('尚無選區可複製');
            return;
        }

        // 使用臨時textarea來複製內容
        const textarea = document.createElement('textarea');
        textarea.value = outputResult.textContent;
        document.body.appendChild(textarea);
        textarea.select();

        try {
            // 嘗試複製到剪貼板
            const successful = document.execCommand('copy');
            if (successful) {
                // 更改按鈕文字顯示複製成功
                const originalText = copyCodeBtn.innerHTML;
                copyCodeBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    已複製!
                `;
                copyCodeBtn.classList.remove('bg-gray-500', 'hover:bg-gray-600');
                copyCodeBtn.classList.add('bg-green-500', 'hover:bg-green-600');

                // 2秒後恢復原狀
                setTimeout(function() {
                    copyCodeBtn.innerHTML = originalText;
                    copyCodeBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
                    copyCodeBtn.classList.add('bg-gray-500', 'hover:bg-gray-600');
                }, 2000);
            } else {
                alert('複製失敗，請手動複製');
            }
        } catch (err) {
            console.error('複製出錯:', err);
            alert('複製失敗，請手動複製');
        }

        // 移除臨時元素
        document.body.removeChild(textarea);
    });

    // 複製完整程式碼按鈕
    copyFullCodeBtn.addEventListener('click', function() {
        if (!uploadedImage.src || selections.length === 0) {
            alert('請先上傳圖片並創建至少一個圈選區域');
            return;
        }
        const fullCode = generateFullCode(true);
        // 透過 textarea 複製
        const textarea = document.createElement('textarea');
        textarea.value = fullCode;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    });

    // 複製完整程式碼（無 Base64）按鈕
    copyFullCodeNoBase64Btn.addEventListener('click', function() {
        if (!uploadedImage.src || selections.length === 0) {
            alert('請先上傳圖片並創建至少一個圈選區域');
            return;
        }
        const fullCode = generateFullCode(false);
        const textarea = document.createElement('textarea');
        textarea.value = fullCode;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    });

    // 顯示/隱藏 HTML 代碼切換按鈕
    const toggleBtn = document.getElementById('toggleOutputBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            const pre = document.getElementById('outputResult');
            if (!pre) return;
            pre.classList.toggle('hidden');
            if (pre.classList.contains('hidden')) {
                this.innerHTML = '<i class="fas fa-eye mr-1"></i>顯示代碼';
            } else {
                this.innerHTML = '<i class="fas fa-eye-slash mr-1"></i>隱藏代碼';
            }
        });
    }

    // 開始繪製選擇區域
    imageContainer.addEventListener('mousedown', function(e) {
        // 如果圖片尚未上傳，不執行任何操作
        if (uploadedImage.classList.contains('hidden')) return;

        const target = e.target;

        // 處理刪除按鈕點擊 - 這個在任何模式下都可以操作
        if (target.classList.contains('delete-btn')) {
            deleteSelectionInternal(target.parentElement);
            return;
        }

        // 處理調整大小的處理器點擊 - 這個在任何模式下都可以操作
        if (target.classList.contains('resize-handle')) {
            isResizing = true;
            resizeHandle = target;
            selectedElement = target.parentElement;

            const rect = selectedElement.getBoundingClientRect();
            originalWidth = rect.width;
            originalHeight = rect.height;
            originalLeft = parseInt(selectedElement.style.left);
            originalTop = parseInt(selectedElement.style.top);

            document.body.classList.add('resizing');
            return;
        }

        // 處理選區拖動 - 這個在任何模式下都可以操作
        if (target.classList.contains('selection-area') || target.closest('.selection-area')) {
            // 如果我們正在繪製多邊形，則直接點擊繼續，不處理拖動
            if (isDrawingPolygon && currentShape === 'polygon') {
                return;
            }

            selectedElement = target.classList.contains('selection-area') ? target : target.closest('.selection-area');
            startX = e.clientX;
            startY = e.clientY;

            // 高亮選中的選區
            document.querySelectorAll('.selection-area').forEach(el => {
                el.classList.remove('selected');
            });
            selectedElement.classList.add('selected');

            document.body.classList.add('dragging');
            return;
        }

        const rect = imageContainer.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        // 相對於圖片的位置比例
        const imgRect = uploadedImage.getBoundingClientRect();

        // 確保點擊是在圖片上
        if (
            offsetX < imgRect.left - rect.left ||
            offsetX > imgRect.right - rect.left ||
            offsetY < imgRect.top - rect.top ||
            offsetY > imgRect.bottom - rect.top
        ) {
            return;
        }

        // 處理多邊形選區繪製
        if (currentShape === 'polygon') {
            handlePolygonClick(offsetX, offsetY, imgRect, rect, e);
            return;
        }

        // 開始矩形或圓形繪製
        isDrawing = true;
        startX = offsetX;
        startY = offsetY;

        // 使用時間戳生成新的選區元素 ID
        const selId = generateSelectionId();
        const selectionDiv = document.createElement('div');
        selectionDiv.className = 'selection-area';
        selectionDiv.id = selId;
        selectionDiv.setAttribute('data-name', selId);

        if (currentShape === 'circle') {
            selectionDiv.classList.add('circular');
        }

        selectionDiv.style.left = startX + 'px';
        selectionDiv.style.top = startY + 'px';
        selectionDiv.style.width = '0';
        selectionDiv.style.height = '0';

        // 創建調整大小的把手
        const nwHandle = document.createElement('div');
        nwHandle.className = 'resize-handle nw';

        const neHandle = document.createElement('div');
        neHandle.className = 'resize-handle ne';

        const swHandle = document.createElement('div');
        swHandle.className = 'resize-handle sw';

        const seHandle = document.createElement('div');
        seHandle.className = 'resize-handle se';

        // 創建刪除按鈕
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '×';

        // 創建標籤
        const label = document.createElement('div');
        label.className = 'selection-label';
        label.textContent = selId;

        selectionDiv.appendChild(nwHandle);
        selectionDiv.appendChild(neHandle);
        selectionDiv.appendChild(swHandle);
        selectionDiv.appendChild(seHandle);
        selectionDiv.appendChild(deleteBtn);
        selectionDiv.appendChild(label);

        selectionsContainer.appendChild(selectionDiv);
        // 點擊左側選區時，高亮右側清單
        selectionDiv.addEventListener('click', function(evt) {
            evt.stopPropagation();
            highlightListItem(selId, 'green');
        });
        selectedElement = selectionDiv;

        // 標記容器為繪製狀態
        imageContainer.classList.add('drawing');
    });

    // 處理多邊形點擊事件 - 修復無法添加多個點的問題
    function handlePolygonClick(offsetX, offsetY, imgRect, containerRect, event) {
        const imgOffsetLeft = imgRect.left - containerRect.left;
        const imgOffsetTop = imgRect.top - containerRect.top;

        // 相對於圖片的坐標
        const relativeX = offsetX - imgOffsetLeft;
        const relativeY = offsetY - imgOffsetTop;

        // 確保點擊在圖片內
        if (relativeX < 0 || relativeX > imgRect.width || relativeY < 0 || relativeY > imgRect.height) {
            return;
        }

        // 如果這是第一個點，創建多邊形元素
        if (!isDrawingPolygon) {
            isDrawingPolygon = true;
            polygonPoints = [];

            // 創建多邊形元素
            currentPolygonElement = document.createElement('div');
            currentPolygonElement.className = 'selection-area polygon-selection';
            // 使用時間戳生成唯一 ID
            const polyId = generateSelectionId();
            currentPolygonElement.id = polyId;
            currentPolygonElement.setAttribute('data-name', polyId);

            // 創建SVG來繪製多邊形
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.pointerEvents = 'none';

            // 創建多邊形路徑
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('fill', 'rgba(6, 182, 212, 0.2)');
            polygon.setAttribute('stroke', 'rgb(6, 182, 212)');
            polygon.setAttribute('stroke-width', '2');
            polygon.style.pointerEvents = 'none';

            svg.appendChild(polygon);
            currentPolygonElement.appendChild(svg);

            // 創建臨時線條用於跟隨鼠標
            temporaryLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            temporaryLine.setAttribute('stroke', 'rgb(6, 182, 212)');
            temporaryLine.setAttribute('stroke-width', '2');
            temporaryLine.setAttribute('stroke-dasharray', '5,5');
            svg.appendChild(temporaryLine);

            // 先不添加刪除按鈕和標籤，等待多邊形完成後再添加

            // 設置初始位置和尺寸
            currentPolygonElement.style.position = 'absolute';
            currentPolygonElement.style.left = imgOffsetLeft + 'px';
            currentPolygonElement.style.top = imgOffsetTop + 'px';
            currentPolygonElement.style.width = imgRect.width + 'px';
            currentPolygonElement.style.height = imgRect.height + 'px';

            selectionsContainer.appendChild(currentPolygonElement);
        } else if (polygonPoints.length >= 3) {
            // 檢查是否點擊了第一個點
            const firstPoint = polygonPoints[0];
            const distance = Math.sqrt(
                Math.pow(relativeX - firstPoint.x, 2) +
                Math.pow(relativeY - firstPoint.y, 2)
            );

            // 如果點擊了第一個點，詢問是否閉合多邊形
            if (distance < CLOSE_DISTANCE_THRESHOLD) {
                if (confirm('要閉合多邊形嗎？')) {
                    finishPolygon(imgRect, containerRect);
                    return;
                } else {
                    // 用戶選擇不閉合，繼續添加點
                    // 重置高亮
                    isNearFirstPoint = false;
                    if (firstPointHighlight) {
                        firstPointHighlight.style.display = 'none';
                    }
                }
            }
        }

        // 添加點到數組
        polygonPoints.push({ x: relativeX, y: relativeY });

        // 更新多邊形
        updatePolygonPath();

        // 創建點的視覺指示
        const pointIndicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        pointIndicator.setAttribute('cx', relativeX);
        pointIndicator.setAttribute('cy', relativeY);
        pointIndicator.setAttribute('r', '4');
        pointIndicator.setAttribute('fill', '#ff6b00');
        pointIndicator.setAttribute('stroke', 'white');
        pointIndicator.setAttribute('stroke-width', '2');
        currentPolygonElement.querySelector('svg').appendChild(pointIndicator);

        // 為第一個點添加特殊樣式
        if (polygonPoints.length === 1) {
            pointIndicator.setAttribute('r', '5');
            pointIndicator.setAttribute('fill', '#ffcc00');
            pointIndicator.setAttribute('stroke', '#ff6b00');
            pointIndicator.setAttribute('stroke-width', '2.5');
            pointIndicator.classList.add('first-polygon-point');
        }

        // 檢查是否要閉合多邊形（超過50個點）
        if (polygonPoints.length >50) {
            if (confirm('已達到50個點，要自動閉合多邊形嗎？')) {
                finishPolygon(imgRect, containerRect);
                return;
            }
        }

        // 修改：阻止事件冒泡，避免同時觸發其他事件處理器
        if (event) {
            event.stopPropagation();
        }
    }

    // 創建一個單獨的函數來處理多邊形繪製中的鼠標移動
    function handlePolygonMouseMove(e) {
        if (!isDrawingPolygon || polygonPoints.length === 0 || !currentPolygonElement) {
            return;
        }

        const rect = imageContainer.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        const imgRect = uploadedImage.getBoundingClientRect();
        const imgOffsetLeft = imgRect.left - rect.left;
        const imgOffsetTop = imgRect.top - rect.top;

        // 計算相對於圖片的坐標
        const relativeX = offsetX - imgOffsetLeft;
        const relativeY = offsetY - imgOffsetTop;

        // 更新臨時線條，從最後一點到當前鼠標位置
        const lastPoint = polygonPoints[polygonPoints.length - 1];

        if (temporaryLine) {
            temporaryLine.setAttribute('x1', lastPoint.x);
            temporaryLine.setAttribute('y1', lastPoint.y);
            temporaryLine.setAttribute('x2', relativeX);
            temporaryLine.setAttribute('y2', relativeY);
        }

        // 檢查是否接近第一個點（僅當有至少3個點時才檢查）
        if (polygonPoints.length >= 3) {
            const firstPoint = polygonPoints[0];
            const distance = Math.sqrt(
                Math.pow(relativeX - firstPoint.x, 2) +
                Math.pow(relativeY - firstPoint.y, 2)
            );

            // 如果接近第一個點，顯示視覺提示
            if (distance < CLOSE_DISTANCE_THRESHOLD) {
                if (!isNearFirstPoint) {
                    isNearFirstPoint = true;

                    // 創建或顯示第一個點的高亮效果
                    if (!firstPointHighlight) {
                        firstPointHighlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                        firstPointHighlight.setAttribute('cx', firstPoint.x);
                        firstPointHighlight.setAttribute('cy', firstPoint.y);
                        firstPointHighlight.setAttribute('r', '8');
                        firstPointHighlight.setAttribute('fill', 'rgba(255, 215, 0, 0.5)');
                        firstPointHighlight.setAttribute('stroke', 'gold');
                        firstPointHighlight.setAttribute('stroke-width', '2');
                        firstPointHighlight.setAttribute('class', 'first-point-highlight');
                        currentPolygonElement.querySelector('svg').appendChild(firstPointHighlight);
                    } else {
                        firstPointHighlight.style.display = 'block';
                    }

                    // 更新提示文字，詢問是否要閉合多邊形
                    if (!isShowingCloseConfirm && polygonHint) {
                        const originalHtml = polygonHint.innerHTML;
                        polygonHint.innerHTML = `
                            <strong>要閉合多邊形嗎？</strong><br>
                            <button id="confirmClosePolygon" class="px-2 py-1 bg-green-500 text-white rounded mr-2">確認閉合</button>
                            <button id="cancelClosePolygon" class="px-2 py-1 bg-gray-500 text-white rounded">繼續編輯</button>
                        `;

                        // 添加按鈕事件
                        document.getElementById('confirmClosePolygon').addEventListener('click', function() {
                            finishPolygon(imgRect, rect);
                            isShowingCloseConfirm = false;
                        });

                        document.getElementById('cancelClosePolygon').addEventListener('click', function() {
                            // 恢復原來的提示
                            polygonHint.innerHTML = originalHtml;
                            isShowingCloseConfirm = false;
                        });

                        isShowingCloseConfirm = true;
                    }
                }
            } else {
                // 如果離開第一個點範圍，隱藏高亮
                if (isNearFirstPoint) {
                    isNearFirstPoint = false;
                    if (firstPointHighlight) {
                        firstPointHighlight.style.display = 'none';
                    }

                    // 如果沒有顯示確認對話框，恢復原來的提示
                    if (!isShowingCloseConfirm && polygonHint) {
                        polygonHint.innerHTML = `
                            <strong>不規則選區繪製:</strong><br>
                            1. 點擊圖片上的點來創建多邊形頂點<br>
                            2. 每次點擊添加一個點（至少需要3個點）<br>
                            3. 點擊靠近起始點的位置可閉合多邊形<br>
                            4. 50個點後會自動閉合
                        `;
                    }
                }
            }
        }
    }

    // 更新多邊形路徑
    function updatePolygonPath() {
        if (!currentPolygonElement || polygonPoints.length === 0) return;

        const svg = currentPolygonElement.querySelector('svg');
        const polygon = svg.querySelector('polygon');

        // 更新多邊形路徑
        const pointsString = polygonPoints.map(p => `${p.x},${p.y}`).join(' ');
        polygon.setAttribute('points', pointsString);
    }

    // 完成多邊形繪製
    function finishPolygon(imgRect, containerRect) {
        if (!currentPolygonElement || polygonPoints.length < 3) {
            resetPolygonDrawing();
            return;
        }

        // 通知用戶多邊形已完成
        if (polygonHint) {
            polygonHint.innerHTML = '<strong>多邊形選區已完成!</strong>';
            setTimeout(function() {
                polygonHint.style.display = 'none';
            }, 2000);
        }

        // 移除臨時線條
        const svg = currentPolygonElement.querySelector('svg');
        const tempLine = svg.querySelector('line');
        if (tempLine) {
            svg.removeChild(tempLine);
        }

        // 使用時間戳生成 ID
        const polyId = generateSelectionId();
        currentPolygonElement.id = polyId;
        currentPolygonElement.setAttribute('data-name', polyId);

        // 獲取多邊形的邊界
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        polygonPoints.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        });

        // 確保有效的寬度和高度
        const width = Math.max(10, maxX - minX);
        const height = Math.max(10, maxY - minY);

        // 計算相對於圖片的百分比
        const imgWidth = imgRect.width;
        const imgHeight = imgRect.height;

        const relativeLeft = minX / imgWidth;
        const relativeTop = minY / imgHeight;
        const relativeWidth = width / imgWidth;
        const relativeHeight = height / imgHeight;

        // 調整多邊形坐標相對於新的邊界
        const adjustedPoints = polygonPoints.map(point => {
            return {
                x: Number(((point.x - minX) / width * 100).toFixed(2)),
                y: Number(((point.y - minY) / height * 100).toFixed(2))
            };
        });

        // 更新多邊形位置和大小
        currentPolygonElement.style.left = (imgRect.left - containerRect.left + minX) + 'px';
        currentPolygonElement.style.top = (imgRect.top - containerRect.top + minY) + 'px';
        currentPolygonElement.style.width = width + 'px';
        currentPolygonElement.style.height = height + 'px';

        // 更新SVG和多邊形大小
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);

        // 更新多邊形路徑
        const polygon = svg.querySelector('polygon');
        const pointsString = adjustedPoints.map(p => `${p.x},${p.y}`).join(' ');
        polygon.setAttribute('points', pointsString);

        // 現在添加刪除按鈕和標籤
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.style.position = 'absolute';
        deleteBtn.style.top = '0';
        deleteBtn.style.right = '0';

        // 創建標籤
        const label = document.createElement('div');
        label.className = 'selection-label';
        label.textContent = 'selection-' + polyId;

        currentPolygonElement.appendChild(deleteBtn);
        currentPolygonElement.appendChild(label);

        // 添加到選區列表
        selections.push({
            id: polyId,
            name: polyId,
            shape: 'polygon',
            left: relativeLeft,
            top: relativeTop,
            width: relativeWidth,
            height: relativeHeight,
            elementRef: currentPolygonElement,
            polygonPoints: adjustedPoints
        });

        updateSelectionsList();

        // 重置多邊形繪製狀態
        resetPolygonDrawing();
        // 多邊形選區也可點擊高亮列表
        currentPolygonElement.addEventListener('click', function(evt) {
            evt.stopPropagation();
            highlightListItem(polyId, 'green');
        });
    }

    // 重置多邊形繪製狀態
    function resetPolygonDrawing() {
        isDrawingPolygon = false;
        polygonPoints = [];
        isNearFirstPoint = false;
        isShowingCloseConfirm = false;

        // 清除第一個點的高亮效果
        if (firstPointHighlight) {
            firstPointHighlight.style.display = 'none';
            firstPointHighlight = null;
        }

        // 清除可能存在的未完成多邊形
        if (currentPolygonElement && currentPolygonElement.parentNode) {
            currentPolygonElement.parentNode.removeChild(currentPolygonElement);
        }

        currentPolygonElement = null;
        temporaryLine = null;

        // 移除多邊形模式指示
        imageContainer.classList.remove('polygon-active');
    }

    // 繪製選擇區域
    imageContainer.addEventListener('mousemove', function(e) {
        if (!uploadedImage.src) return;

        const rect = imageContainer.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        // 處理多邊形繪製中的鼠標移動
        if (isDrawingPolygon) {
            handlePolygonMouseMove(e);
            return;
        }

        // 調整大小處理
        if (isResizing && resizeHandle && selectedElement) {
            e.preventDefault();

            const selectionRect = selectedElement.getBoundingClientRect();
            let newWidth, newHeight, newLeft, newTop;

            // 根據不同的調整把手計算新的尺寸和位置
            if (resizeHandle.classList.contains('se')) {
                newWidth = offsetX - parseInt(selectedElement.style.left);
                newHeight = offsetY - parseInt(selectedElement.style.top);
                newLeft = parseInt(selectedElement.style.left);
                newTop = parseInt(selectedElement.style.top);
            } else if (resizeHandle.classList.contains('sw')) {
                newWidth = parseInt(selectedElement.style.left) + parseInt(selectedElement.style.width) - offsetX;
                newHeight = offsetY - parseInt(selectedElement.style.top);
                newLeft = offsetX;
                newTop = parseInt(selectedElement.style.top);
            } else if (resizeHandle.classList.contains('ne')) {
                newWidth = offsetX - parseInt(selectedElement.style.left);
                newHeight = parseInt(selectedElement.style.top) + parseInt(selectedElement.style.height) - offsetY;
                newLeft = parseInt(selectedElement.style.left);
                newTop = offsetY;
            } else if (resizeHandle.classList.contains('nw')) {
                newWidth = parseInt(selectedElement.style.left) + parseInt(selectedElement.style.width) - offsetX;
                newHeight = parseInt(selectedElement.style.top) + parseInt(selectedElement.style.height) - offsetY;
                newLeft = offsetX;
                newTop = offsetY;
            }

            // 確保最小尺寸
            newWidth = Math.max(20, newWidth);
            newHeight = Math.max(20, newHeight);

            // 如果是圓形，保持寬高一致
            if (selectedElement.classList.contains('circular')) {
                const size = Math.max(newWidth, newHeight);
                newWidth = size;
                newHeight = size;
            }

            // 更新選區尺寸和位置
            selectedElement.style.width = newWidth + 'px';
            selectedElement.style.height = newHeight + 'px';
            selectedElement.style.left = newLeft + 'px';
            selectedElement.style.top = newTop + 'px';

            return;
        }

        // 拖動處理
        if (selectedElement && !isDrawing) {
            e.preventDefault();

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            const left = parseInt(selectedElement.style.left) || 0;
            const top = parseInt(selectedElement.style.top) || 0;

            selectedElement.style.left = (left + deltaX) + 'px';
            selectedElement.style.top = (top + deltaY) + 'px';

            startX = e.clientX;
            startY = e.clientY;

            return;
        }

        // 繪製新選區
        if (isDrawing && selectedElement) {
            e.preventDefault();

            let width = offsetX - startX;
            let height = offsetY - startY;
            let left = startX;
            let top = startY;

            // 處理負值情況
            if (width < 0) {
                width = Math.abs(width);
                left = offsetX;
            }

            if (height < 0) {
                height = Math.abs(height);
                top = offsetY;
            }

            // 如果是圓形，保持寬高一致
            if (currentShape === 'circle') {
                const size = Math.max(width, height);
                width = size;
                height = size;
            }

            selectedElement.style.width = width + 'px';
            selectedElement.style.height = height + 'px';
            selectedElement.style.left = left + 'px';
            selectedElement.style.top = top + 'px';
        }
    });

    // 完成繪製選擇區域
    imageContainer.addEventListener('mouseup', function() {
        if (isDrawing) {
            isDrawing = false;

            // 如果選區太小，則刪除它
            if (
                parseInt(selectedElement.style.width) < 20 ||
                parseInt(selectedElement.style.height) < 20
            ) {
                selectionsContainer.removeChild(selectedElement);
            } else {
                // 使用 selId 作為選區名稱和 id
                const id = selectedElement.id;
                const shape = selectedElement.classList.contains('circular') ? 'circle' : 'rectangle';

                const imgRect = uploadedImage.getBoundingClientRect();
                const containerRect = imageContainer.getBoundingClientRect();

                const imgOffsetLeft = imgRect.left - containerRect.left;
                const imgOffsetTop = imgRect.top - containerRect.top;

                // 計算相對於圖片的位置比例
                const left = parseInt(selectedElement.style.left);
                const top = parseInt(selectedElement.style.top);
                const width = parseInt(selectedElement.style.width);
                const height = parseInt(selectedElement.style.height);

                // 轉換為相對於圖片的百分比
                const relativeLeft = (left - imgOffsetLeft) / imgRect.width;
                const relativeTop = (top - imgOffsetTop) / imgRect.height;
                const relativeWidth = width / imgRect.width;
                const relativeHeight = height / imgRect.height;

                selections.push({
                    id: id,
                    name: id,
                    shape: shape,
                    left: relativeLeft,
                    top: relativeTop,
                    width: relativeWidth,
                    height: relativeHeight,
                    elementRef: selectedElement
                });

                updateSelectionsList();
            }

            selectedElement = null;
            imageContainer.classList.remove('drawing');
        } else if (isResizing) {
            isResizing = false;
            resizeHandle = null;
            document.body.classList.remove('resizing');

            // 更新選區數據
            updateSelectionData(selectedElement);
        } else if (selectedElement) {
            // 更新拖動後的選區數據
            updateSelectionData(selectedElement);
            selectedElement = null;
            document.body.classList.remove('dragging');
        }
    });

    // 預覽按鈕功能
    previewBtn.addEventListener('click', function() {
        if (!uploadedImage.src || selections.length === 0) {
            alert('請先上傳圖片並創建至少一個圈選區域');
            return;
        }

        // 顯示預覽容器
        previewContainer.classList.remove('hidden');

        // 設置預覽圖片
        previewImage.src = uploadedImage.src;

        // 等待圖片加載完成後再添加選區
        previewImage.onload = function() {
            updatePreview();
        };

        // 如果圖片已經加載，直接更新預覽
        if (previewImage.complete) {
            updatePreview();
        }

        // 滾動到預覽區域
        previewContainer.scrollIntoView({ behavior: 'smooth' });
    });

    // 更新拖動或調整大小後的選區數據
    function updateSelectionData(element) {
        const id = element.id;
        const selectionIndex = selections.findIndex(sel => sel.id === id);

        if (selectionIndex !== -1) {
            const imgRect = uploadedImage.getBoundingClientRect();
            const containerRect = imageContainer.getBoundingClientRect();

            const imgOffsetLeft = imgRect.left - containerRect.left;
            const imgOffsetTop = imgRect.top - containerRect.top;

            // 計算相對於圖片的位置比例
            const left = parseInt(element.style.left);
            const top = parseInt(element.style.top);
            const width = parseInt(element.style.width);
            const height = parseInt(element.style.height);

            // 轉換為相對於圖片的百分比
            const relativeLeft = (left - imgOffsetLeft) / imgRect.width;
            const relativeTop = (top - imgOffsetTop) / imgRect.height;
            const relativeWidth = width / imgRect.width;
            const relativeHeight = height / imgRect.height;

            selections[selectionIndex].left = relativeLeft;
            selections[selectionIndex].top = relativeTop;
            selections[selectionIndex].width = relativeWidth;
            selections[selectionIndex].height = relativeHeight;

            updateSelectionsList();
        }
    }

    // 刪除選區
    function deleteSelectionInternal(element) {
        const id = element.id;
        const index = selections.findIndex(sel => sel.id === id);

        if (index !== -1) {
            selections.splice(index, 1);
            selectionsContainer.removeChild(element);
            updateSelectionsList();
            updateOutputResult();
        }
    }

    // 暴露刪除功能到全局
    window.deleteSelection = function(elementId) {
        const element = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
        if (element) {
            deleteSelectionInternal(element);
        }
    };

    // 配置動作：滑動到 DOM、外部連結、加入購物車
    function promptSelect(title, options, defaultValue) {
        return new Promise((resolve) => {
            // 遮罩背景
            const modalBg = document.createElement('div');
            modalBg.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
            // Modal 容器
            const modal = document.createElement('div');
            modal.className = 'bg-white p-6 rounded-xl shadow-lg w-80';
            // 標題
            const titleEl = document.createElement('h3');
            titleEl.className = 'text-lg font-semibold mb-4';
            titleEl.textContent = title;
            modal.appendChild(titleEl);
            // 下拉選單
            const selectEl = document.createElement('select');
            selectEl.className = 'w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500';
            // 支援字串或物件格式選項
            options.forEach(opt => {
                const optionEl = document.createElement('option');
                if (typeof opt === 'object') {
                    optionEl.value = opt.value;
                    optionEl.textContent = opt.text;
                    if (opt.value === defaultValue) optionEl.selected = true;
                } else {
                    optionEl.value = opt;
                    optionEl.textContent = opt;
                    if (opt === defaultValue) optionEl.selected = true;
                }
                selectEl.appendChild(optionEl);
            });
            modal.appendChild(selectEl);
            // 按鈕區
            const btnContainer = document.createElement('div');
            btnContainer.className = 'flex justify-end space-x-2';
            const btnCancel = document.createElement('button');
            btnCancel.className = 'px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400';
            btnCancel.textContent = '取消';
            const btnOk = document.createElement('button');
            btnOk.className = 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600';
            btnOk.textContent = '確定';
            btnContainer.appendChild(btnCancel);
            btnContainer.appendChild(btnOk);
            modal.appendChild(btnContainer);
            modalBg.appendChild(modal);
            document.body.appendChild(modalBg);
            // 綁定事件
            btnOk.addEventListener('click', () => {
                const val = selectEl.value;
                document.body.removeChild(modalBg);
                resolve(val);
            });
            btnCancel.addEventListener('click', () => {
                document.body.removeChild(modalBg);
                resolve(null);
            });
        });
    }

    function configureAction(type, id) {
        const selection = selections.find(s => s.id === id);
        if (!selection) return;
        if (type === 'scroll') {
            const opts = selections.map(s => ({
                value: '#' + s.name,
                text: s.description ? `${s.description} (#${s.name})` : `#${s.name}`
            }));
            promptSelect('請選擇要滾動到的元素', opts, selection.scrollSelector || opts[0].value)
                .then(selector => {
                    if (selector !== null) {
                        selection.scrollSelector = selector;
                        updateSelectionsList();
                        updateOutputResult();
                    }
                });
            return;
        } else if (type === 'link') {
            const url = prompt('請輸入外部連結 URL：', selection.externalLink || '');
            if (url !== null) selection.externalLink = url;
        } else if (type === 'cart') {
            const pid = prompt('請輸入購物車 pid：', selection.pid || '');
            if (pid !== null) selection.pid = pid;
        }
        updateSelectionsList();
        updateOutputResult();
    }
    // 暴露配置動作到全局
    window.configureAction = configureAction;

    // 處理選區點擊動作：滑動、連結、購物車等
    function handleSelectionAction(id) {
        const sel = selections.find(s => s.id === id);
        if (!sel) return;
        // 優先滑動
        if (sel.scrollSelector) {
            scrollToSelector(sel.scrollSelector);
            return;
        }
        // 外部連結
        if (sel.externalLink) {
            openLinkUrl(sel.externalLink);
            return;
        }
        // 購物車操作
        if (sel.pid) {
            addToCart(sel.pid);
            return;
        }
        alert('此選區尚未設定任何動作');
    }
    // 購物車添加函數（可自行實作 API 呼叫）
    function addToCart(pid) {
        console.log('Add to cart pid:', pid);
        alert('已添加到購物車，PID: ' + pid);
    }
    // 暴露到全局
    window.handleSelectionAction = handleSelectionAction;
    window.addToCart = addToCart;

    // 切換動作按鈕顯示
    function toggleConfigRow(id) {
        const el = document.getElementById(`action-buttons-${id}`);
        if (el) el.classList.toggle('hidden');
    }
    window.toggleConfigRow = toggleConfigRow;

    // 更新選區列表顯示
    function updateSelectionsList() {
        if (selections.length === 0) {
            noSelectionsText.classList.remove('hidden');
            selectionsList.innerHTML = '';
            return;
        }

        noSelectionsText.classList.add('hidden');
        selectionsList.innerHTML = selections.map(selection => {
            const percentLeft = (selection.left * 100).toFixed(2);
            const percentTop = (selection.top * 100).toFixed(2);
            const percentWidth = (selection.width * 100).toFixed(2);
            const percentHeight = (selection.height * 100).toFixed(2);

            return `
                <div id="list-${selection.id}" class="selection-item bg-white p-4 rounded-lg shadow mb-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="font-semibold text-sm">${selection.name}</h3>
                            <p class="text-sm text-gray-600">
                                位置: 左${percentLeft}% 上${percentTop}%<br>
                                尺寸: 寬${percentWidth}% 高${percentHeight}%
                            </p>
                            ${selection.description ? `<p class="text-sm text-gray-800 mt-2">說明: ${selection.description}</p>` : ''}
                        </div>

                    </div>
                                     <div class="flex space-x-2">
                            <button onclick="editId('${selection.id}')" class="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm">ID編輯</button>
                            <button onclick="editDescription('${selection.id}')" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">Alt編輯</button>
                            <button onclick="deleteSelection('${selection.id}')" class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">刪除</button>

                        </div>
                    <hr class="my-2">
                                                <button onclick="toggleConfigRow('${selection.id}')" class="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800 text-sm">設定動作</button>
                    <div id="action-buttons-${selection.id}" class="mt-2 flex space-x-2 hidden">
                        <button onclick="configureAction('scroll','${selection.id}')" class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm">滑動</button>
                        <button onclick="configureAction('link','${selection.id}')" class="px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-sm">設定連結</button>
                        <button onclick="configureAction('cart','${selection.id}')" class="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm">購物車</button>
                    </div>
                </div>
            `;
        }).join('');

        updateOutputResult();

        // 如果預覽已經顯示，更新預覽
        if (!previewContainer.classList.contains('hidden') && previewImage.src) {
            updatePreview();
        }
    }

    // 專門用於更新預覽的函數
    function updatePreview() {
        // 清空現有的預覽選擇區
        while (previewSelections.firstChild) {
            previewSelections.removeChild(previewSelections.firstChild);
        }

        // 設置預覽圖像
        previewImage.src = uploadedImage.src;

        // 創建選區預覽元素
        selections.forEach(selection => {
            const previewElement = document.createElement('div');
            previewElement.id = selection.name + '-preview';
            previewElement.className = 'preview-selection';

            // 設置基本樣式
            previewElement.style.position = 'absolute';
            previewElement.style.left = (selection.left * 100) + '%';
            previewElement.style.top = (selection.top * 100) + '%';
            previewElement.style.width = (selection.width * 100) + '%';
            previewElement.style.height = (selection.height * 100) + '%';
            previewElement.style.backgroundColor = 'rgba(0, 123, 255, 0.3)';
            previewElement.style.cursor = 'pointer';

            // 設置形狀特定的樣式
            if (selection.shape === 'circle') {
                previewElement.style.borderRadius = '50%';
            } else if (selection.shape === 'polygon' && selection.polygonPoints) {
                try {
                    // 確保多邊形點位格式正確
                    const clipPath = `polygon(${selection.polygonPoints.map(p => `${p.x}% ${p.y}%`).join(', ')})`;
                    previewElement.style.clipPath = clipPath;
                } catch (e) {
                    console.error('Error setting clip-path:', e);
                }
            }

            // 添加懸停效果
            previewElement.addEventListener('mouseover', function() {
                this.style.backgroundColor = 'rgba(0, 123, 255, 0.5)';
            });

            previewElement.addEventListener('mouseout', function() {
                this.style.backgroundColor = 'rgba(0, 123, 255, 0.3)';
            });

            // 添加點擊效果
            previewElement.addEventListener('click', function() {
                handleSelectionAction(selection.id);
            });

            previewSelections.appendChild(previewElement);
        });
    }

    // 生成輸出結果
    function updateOutputResult() {
        if (selections.length === 0) {
            outputResult.textContent = '尚無選區';

            // 如果有預覽內容，也清空預覽
            if (!previewContainer.classList.contains('hidden')) {
                previewSelections.innerHTML = '';
            }

            return;
        }

        const { htmlCode, jsCode } = generateSelectionCode();
        outputResult.textContent = htmlCode + jsCode;

        // 如果預覽已經開啟，更新預覽內容
        if (!previewContainer.classList.contains('hidden') && previewImage.src) {
            updatePreview();
        }
    }

    // 處理窗口調整大小時重新計算選區位置
    window.addEventListener('resize', function() {
        if (!uploadedImage.src || selections.length === 0) return;

        const imgRect = uploadedImage.getBoundingClientRect();
        const containerRect = imageContainer.getBoundingClientRect();

        const imgOffsetLeft = imgRect.left - containerRect.left;
        const imgOffsetTop = imgRect.top - containerRect.top;

        selections.forEach(selection => {
            const element = selection.elementRef;

            // 重新計算絕對位置
            const left = imgOffsetLeft + (selection.left * imgRect.width);
            const top = imgOffsetTop + (selection.top * imgRect.height);
            const width = selection.width * imgRect.width;
            const height = selection.height * imgRect.height;

            element.style.left = left + 'px';
            element.style.top = top + 'px';
            element.style.width = width + 'px';
            element.style.height = height + 'px';
        });
    });

    // 處理文檔級別的鼠標事件，確保拖動和調整大小在整個文檔中都有效
    document.addEventListener('mousemove', function(e) {
        if ((isDrawing || isResizing || selectedElement) && !e.target.closest('#imageContainer')) {
            const event = new MouseEvent('mousemove', {
                clientX: e.clientX,
                clientY: e.clientY,
                bubbles: true
            });
            imageContainer.dispatchEvent(event);
        }
    });

    document.addEventListener('mouseup', function(e) {
        if (isDrawing || isResizing || selectedElement) {
            const event = new MouseEvent('mouseup', {
                bubbles: true
            });
            imageContainer.dispatchEvent(event);
        }
    });

    // 最大化按鈕
    maximizeBtn.addEventListener('click', function() {
        if (!uploadedImage.src || uploadedImage.classList.contains('hidden')) {
            alert('請先上傳圖片');
            return;
        }

        // 切換最大化狀態
        if (imageContainer.classList.contains('maximize-mode')) {
            // 恢復正常顯示模式
            imageContainer.classList.remove('maximize-mode');
            uploadedImage.classList.remove('width-maximized');
            maximizeBtn.innerHTML = '<i class="fas fa-expand mr-2"></i>最大化';
            maximizeBtn.setAttribute('data-tooltip', '最大化顯示圖片');
        } else {
            // 切換到最大化顯示模式
            imageContainer.classList.add('maximize-mode');
            uploadedImage.classList.add('width-maximized');
            maximizeBtn.innerHTML = '<i class="fas fa-compress mr-2"></i>恢復';
            maximizeBtn.setAttribute('data-tooltip', '恢復原始尺寸');
        }

        // 更新選區位置（因為圖片尺寸變化）
        selections.forEach(selection => {
            const element = document.getElementById(selection.id);
            if (element) {
                element.style.left = `${selection.left * 100}%`;
                element.style.top = `${selection.top * 100}%`;
                element.style.width = `${selection.width * 100}%`;
                element.style.height = `${selection.height * 100}%`;
            }
        });
    });

    function generateSelectionCode() {
        let htmlCode = '';
        let jsCode = '';

        // 建立 HTML 片段，使用 Tailwind class 和 inline style for positioning
        selections.forEach(sel => {
            const left = (sel.left * 100).toFixed(2);
            const top = (sel.top * 100).toFixed(2);
            const width = (sel.width * 100).toFixed(2);
            const height = (sel.height * 100).toFixed(2);
            // 構建 onclick 屬性，優先 scrollSelector，再 externalLink，再 pid
            let onclickAttr = '';
            if (sel.scrollSelector) onclickAttr = ` onclick="scrollToSelector('${sel.scrollSelector}')"`;
            else if (sel.externalLink) onclickAttr = ` onclick="openLinkUrl('${sel.externalLink}')"`;
            else if (sel.pid) onclickAttr = ` onclick="addToCart('${sel.pid}')"`;
            htmlCode += `<div id="${sel.name}"
                 class="absolute ${sel.shape === 'circle' ? 'rounded-full ' : ''}cursor-pointer   transition-colors duration-200"
                 style="left: ${left}%; top: ${top}%; width: ${width}%; height: ${height}%"${onclickAttr}></div>\n`;
        });
        // JS 交互函式
        jsCode = `<script>
    // 平滑滾動
    function scrollToSelector(selector) {
    const el = document.querySelector(selector);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 外部連結
    function openLinkUrl(url) {
    window.open(url, '_blank', 'noopener');
    }

    // 購物車
    function addToCart(pid) {
    alert('已添加到購物車，PID: ' + pid);
    }

    // 點擊執行
    function handleSelectionAction(el) {
    const data = el.dataset;
    if (data.scrollSelector) { scrollToSelector(data.scrollSelector); return; }
    if (data.externalLink) { openLinkUrl(data.externalLink); return; }
    if (data.pid) { addToCart(data.pid); return; }
    alert('尚未設定任何動作');
    }

    //滾動
    function scrollToSelector(selector) {
      const el = document.querySelector(selector);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    //連結
    function openLinkUrl(url) {
      window.open(url, '_blank', 'noopener');
    }

    //購物車
    function addToCart(pid) {
      alert('已添加到購物車，PID: ' + pid);
    }

    function handleSelectionAction(el) {
      const data = el.dataset;
      if (data.scrollSelector) { scrollToSelector(data.scrollSelector); return; }
      if (data.externalLink) { openLinkUrl(data.externalLink); return; }
      if (data.pid) { addToCart(data.pid); return; }
      alert('尚未設定任何動作');
    }

    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('#imageContainer .relative > div[id^="selection-"]')
        .forEach(el => {
          el.addEventListener('click', () => handleSelectionAction(el));
        });
    });
</script>`;
        return { htmlCode, jsCode };
    }

    // 生成包含 Tailwind CSS 與動作函式的完整 HTML
    function generateFullCode(useBase64 = true) {
        const imgSrc = useBase64 ? uploadedImage.src : '';
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image Selections</title>
      <script src="https://cdn.tailwindcss.com"></script>
</head>
<body id="imageContainer" class="bg-white p-4">
  <div class="relative w-full max-w-[800px] mx-auto">
    <img src="${imgSrc}" alt="Selected Image" class="w-full block">
`;
        // 插入選區元素
        selections.forEach(sel => {
            const left = (sel.left * 100).toFixed(2);
            const top = (sel.top * 100).toFixed(2);
            const width = (sel.width * 100).toFixed(2);
            const height = (sel.height * 100).toFixed(2);
            // inline onclick 呼叫相應函式
            let onclickAttr = '';
            if (sel.scrollSelector) onclickAttr = ` onclick="scrollToSelector('${sel.scrollSelector}')"`;
            else if (sel.externalLink) onclickAttr = ` onclick="openLinkUrl('${sel.externalLink}')"`;
            else if (sel.pid) onclickAttr = ` onclick="addToCart('${sel.pid}')"`;
            html += `<div id="${sel.name}"
                 class="absolute ${sel.shape === 'circle' ? 'rounded-full' : ''} cursor-pointer   transition-colors duration-200"
                 style="left: ${left}%; top: ${top}%; width: ${width}%; height: ${height}%"${onclickAttr}></div>
`;
        });
        // 動作函式與事件綁定
        html += `  </div>
  <script>
    function scrollToSelector(selector) {
      const el = document.querySelector(selector);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function openLinkUrl(url) {
      window.open(url, '_blank', 'noopener');
    }
    function addToCart(pid) {
      alert('已添加到購物車，PID: ' + pid);
    }
    function handleSelectionAction(el) {
      const data = el.dataset;
      if (data.scrollSelector) { scrollToSelector(data.scrollSelector); return; }
      if (data.externalLink) { openLinkUrl(data.externalLink); return; }
      if (data.pid) { addToCart(data.pid); return; }
      alert('尚未設定任何動作');
    }
  <\/script>
</body>
</html>`;
        return html;
    }

    document.getElementById('aiRecognitionBtn').addEventListener('click', async () => {
        const selections = getSelectedAreas(); // 假設這個函數能獲取選取的區域
        const textToRecognize = await getTextFromSelections(selections);

        // 呼叫 OpenAI API
        const recognizedText = await callOpenAIAPI(textToRecognize);

        // 顯示識別結果
        displayRecognitionResult(recognizedText);
    });

    // 獲取選取區域的文字
    async function getTextFromSelections(selections) {
        let combinedText = '';
        selections.forEach(selection => {
            combinedText += selection.text + ' '; // 假設每個選取區域都有一個 text 屬性
        });
        return combinedText.trim();
    }

    // 呼叫 OpenAI API
    async function callOpenAIAPI(text) {
        const apiKey = 'your_api_key_here'; // 不建議這樣做，應使用後端代理
        const response = await fetch('YOUR_OPENAI_API_ENDPOINT', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                prompt: text,
                max_tokens: 100 // 根據需要調整
            })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        return data.choices[0].text; // 根據 API 回應格式調整
    }

    // 顯示識別結果
    function displayRecognitionResult(result) {
        const recognizedTextDiv = document.getElementById('recognizedText');
        recognizedTextDiv.innerText = result; // 將識別結果顯示在指定區域
    }
});
