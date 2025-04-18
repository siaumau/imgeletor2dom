document.addEventListener('DOMContentLoaded', function() {
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
    let currentSelectionId = 1;
    
    // 多邊形繪製相關變量
    let isDrawingPolygon = false;
    let polygonPoints = [];
    let currentPolygonElement = null;
    let temporaryLine = null;
    let polygonHint = null;

    // 添加編輯說明的函數
    function editDescriptionInternal(element) {
        const selectionId = element.id;
        const selection = selections.find(s => s.id === selectionId);
        const currentDescription = selection.description || '';
        
        const description = prompt('請輸入此區域的說明：', currentDescription);
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
        if (newId !== null && newId.trim() !== '') {
            const trimmedId = newId.trim();
            selection.name = trimmedId;
            const label = element.querySelector('.selection-label');
            if (label) {
                label.textContent = trimmedId;
            }
            updateSelectionsList();
            updateOutputResult();
        }
    }

    // 暴露給全局的編輯說明函數
    window.editDescription = function(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            editDescriptionInternal(element);
        }
    };

    // 暴露給全局的編輯 ID 函數
    window.editId = function(elementId) {
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
        rectangleBtn.classList.add('active');
        circleBtn.classList.remove('active');
        polygonBtn.classList.remove('active');
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
        circleBtn.classList.add('active');
        rectangleBtn.classList.remove('active');
        polygonBtn.classList.remove('active');
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
        polygonBtn.classList.add('active');
        rectangleBtn.classList.remove('active');
        circleBtn.classList.remove('active');
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
            4. 10個點後會自動閉合
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
        
        const { cssCode, htmlCode } = generateSelectionCode();
        outputResult.textContent = cssCode + htmlCode;
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
        
        // 創建一個包含圖片和選區的HTML代碼
        const imgSrc = uploadedImage.src;
        
        const selectionsHTML = selections.map(selection => {
            const percentLeft = (selection.left * 100).toFixed(2);
            const percentTop = (selection.top * 100).toFixed(2);
            const percentWidth = (selection.width * 100).toFixed(2);
            const percentHeight = (selection.height * 100).toFixed(2);
            
            let attributes = `id="${selection.name}"`;
            
            if (selection.description) {
                attributes += ` data-description="${selection.description}"`;
            }
            
            return `<div ${attributes} 
                      class="absolute ${selection.shape === 'circle' ? 'rounded-full' : ''}" 
                      style="left: ${percentLeft}%; top: ${percentTop}%; width: ${percentWidth}%; height: ${percentHeight}%;">
                  </div>`;
        }).join('\n');
        
        const fullCode = `<div class="relative">
  <img src="${imgSrc}" alt="圖片" class="w-full">
  <div class="absolute top-0 left-0 w-full h-full">
    ${selectionsHTML}
  </div>
</div>`;
        
        // 使用臨時textarea來複製內容
        const textarea = document.createElement('textarea');
        textarea.value = fullCode;
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            // 嘗試複製到剪貼板
            const successful = document.execCommand('copy');
            if (successful) {
                // 更改按鈕文字顯示複製成功
                const originalText = copyFullCodeBtn.innerHTML;
                copyFullCodeBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    已複製!
                `;
                copyFullCodeBtn.classList.remove('bg-indigo-500', 'hover:bg-indigo-600');
                copyFullCodeBtn.classList.add('bg-green-500', 'hover:bg-green-600');
                
                // 2秒後恢復原狀
                setTimeout(function() {
                    copyFullCodeBtn.innerHTML = originalText;
                    copyFullCodeBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
                    copyFullCodeBtn.classList.add('bg-indigo-500', 'hover:bg-indigo-600');
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
        
        // 如果不在繪圖模式下，則不創建新選區
        if (!isDrawing) {
            // 取消所有選中的選區
            document.querySelectorAll('.selection-area').forEach(el => {
                el.classList.remove('selected');
            });
            selectedElement = null;
            return;
        }
        
        // 判斷是否已經選中元素或正在進行調整大小的操作
        if (selectedElement || isResizing) {
            // 先取消當前選中的元素
            selectedElement = null;
            isResizing = false;
            resizeHandle = null;
            
            // 移除所有相關的樣式類
            document.body.classList.remove('dragging', 'resizing');
            
            // 在繪圖模式下，點擊了不相關的區域，則不立即創建新選區
            // 而是等待下一次點擊
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
        
        isDrawing = true;
        startX = offsetX;
        startY = offsetY;
        
        // 創建新的選區元素
        const selectionDiv = document.createElement('div');
        selectionDiv.className = 'selection-area';
        selectionDiv.id = 'selection-' + currentSelectionId;
        selectionDiv.setAttribute('data-name', 'selection-' + currentSelectionId);
        
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
        label.textContent = 'selection-' + currentSelectionId;
        
        selectionDiv.appendChild(nwHandle);
        selectionDiv.appendChild(neHandle);
        selectionDiv.appendChild(swHandle);
        selectionDiv.appendChild(seHandle);
        selectionDiv.appendChild(deleteBtn);
        selectionDiv.appendChild(label);
        
        selectionsContainer.appendChild(selectionDiv);
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
            currentPolygonElement.id = 'selection-' + currentSelectionId;
            currentPolygonElement.setAttribute('data-name', 'selection-' + currentSelectionId);
            
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
        
        // 檢查是否要閉合多邊形
        if (polygonPoints.length > 2) {
            const firstPoint = polygonPoints[0];
            const distance = Math.sqrt(
                Math.pow(relativeX - firstPoint.x, 2) + 
                Math.pow(relativeY - firstPoint.y, 2)
            );
            
            // 如果距離第一個點很近，或者點擊次數超過10次，則閉合多邊形
            if (distance < 20 || polygonPoints.length > 10) {
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
        
        // 獲取多邊形的邊界
        let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
        polygonPoints.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        });
        
        // 計算相對於圖片的百分比
        const imgWidth = imgRect.width;
        const imgHeight = imgRect.height;
        
        const relativeLeft = minX / imgWidth;
        const relativeTop = minY / imgHeight;
        const relativeWidth = (maxX - minX) / imgWidth;
        const relativeHeight = (maxY - minY) / imgHeight;
        
        // 調整多邊形坐標相對於新的邊界
        const adjustedPoints = polygonPoints.map(point => {
            return {
                x: (point.x - minX) / (maxX - minX) * 100,
                y: (point.y - minY) / (maxY - minY) * 100
            };
        });
        
        // 更新多邊形位置和大小
        currentPolygonElement.style.left = (imgRect.left - containerRect.left + minX) + 'px';
        currentPolygonElement.style.top = (imgRect.top - containerRect.top + minY) + 'px';
        currentPolygonElement.style.width = (maxX - minX) + 'px';
        currentPolygonElement.style.height = (maxY - minY) + 'px';
        
        // 更新SVG和多邊形大小
        svg.setAttribute('width', maxX - minX);
        svg.setAttribute('height', maxY - minY);
        
        // 更新多邊形路徑
        const polygon = svg.querySelector('polygon');
        const pointsString = adjustedPoints.map(p => `${p.x}%,${p.y}%`).join(' ');
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
        label.textContent = 'selection-' + currentSelectionId;
        
        currentPolygonElement.appendChild(deleteBtn);
        currentPolygonElement.appendChild(label);
        
        // 添加到選區列表
        selections.push({
            id: currentPolygonElement.id,
            name: 'selection-' + currentSelectionId,
            shape: 'polygon',
            left: relativeLeft,
            top: relativeTop,
            width: relativeWidth,
            height: relativeHeight,
            elementRef: currentPolygonElement,
            polygonPoints: adjustedPoints
        });
        
        currentSelectionId++;
        updateSelectionsList();
        
        // 重置多邊形繪製狀態
        resetPolygonDrawing();
    }
    
    // 重置多邊形繪製狀態
    function resetPolygonDrawing() {
        isDrawingPolygon = false;
        polygonPoints = [];
        currentPolygonElement = null;
        temporaryLine = null;
        
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
                // 添加到選區列表
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
                    name: 'selection-' + currentSelectionId,
                    shape: shape,
                    left: relativeLeft,
                    top: relativeTop,
                    width: relativeWidth,
                    height: relativeHeight,
                    elementRef: selectedElement
                });
                
                currentSelectionId++;
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
                <div class="selection-item bg-white p-4 rounded-lg shadow mb-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="font-semibold text-lg">${selection.name}</h3>
                            <p class="text-sm text-gray-600">
                                位置: 左${percentLeft}% 上${percentTop}%<br>
                                尺寸: 寬${percentWidth}% 高${percentHeight}%
                            </p>
                            ${selection.description ? `<p class="text-sm text-gray-800 mt-2">說明: ${selection.description}</p>` : ''}
                        </div>
                        <div class="space-x-2">
                            <button onclick="editId('${selection.id}')" class="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm">
                                編輯ID
                            </button>
                            <button onclick="editDescription('${selection.id}')" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                                編輯說明
                            </button>
                            <button onclick="deleteSelection('${selection.id}')" class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                                刪除
                            </button>
                        </div>
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
            const id = selection.id.replace('selection-', '');
            previewElement.id = 'preview-element-' + id;
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
            } else if (selection.shape === 'polygon') {
                const clipPath = `polygon(${selection.polygonPoints.map(p => `${p.x}% ${p.y}%`).join(', ')})`;
                previewElement.style.clipPath = clipPath;
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
                alert(`點擊了: ${selection.name}${selection.description ? ' - ' + selection.description : ''}`);
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
        
        const { cssCode, htmlCode } = generateSelectionCode();
        outputResult.textContent = cssCode + htmlCode;
        
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
        let cssCode = '';
        let htmlCode = '';

        selections.forEach(selection => {
            const id = selection.id.replace('selection-', '');
            
            // 為每個選區創建CSS
            cssCode += `
/* ${selection.name} ${selection.description ? '- ' + selection.description : ''} */
.selection-area-${id} {
    position: absolute;
    left: ${(selection.left * 100).toFixed(2)}%;
    top: ${(selection.top * 100).toFixed(2)}%;
    width: ${(selection.width * 100).toFixed(2)}%;
    height: ${(selection.height * 100).toFixed(2)}%;
    cursor: pointer;
`;

            // 添加形狀特定的CSS
            if (selection.shape === 'circle') {
                cssCode += `    border-radius: 50%;\n`;
            } else if (selection.shape === 'polygon') {
                const clipPath = `polygon(${selection.polygonPoints.map(p => `${p.x.toFixed(2)}% ${p.y.toFixed(2)}%`).join(', ')})`;
                cssCode += `    clip-path: ${clipPath};\n`;
            }

            // 添加視覺效果和交互
            cssCode += `    background-color: rgba(0, 123, 255, 0.3);
    transition: background-color 0.3s ease;
}

.selection-area-${id}:hover {
    background-color: rgba(0, 123, 255, 0.5);
}
`;

            // 創建HTML元素
            htmlCode += `<div class="selection-area-${id}" onclick="alert('點擊了: ${selection.name.replace(/'/g, "\\'")}${selection.description ? ' - ' + selection.description.replace(/'/g, "\\'") : ''}');"></div>\n`;
        });

        return { cssCode, htmlCode };
    }
    
    function generateFullCode() {
        let code = '<!DOCTYPE html>\n<html lang="en">\n<head>\n';
        code += '    <meta charset="UTF-8">\n';
        code += '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
        code += '    <title>Image Selections</title>\n';
        code += '    <style>\n';
        code += '        .image-container {\n';
        code += '            position: relative;\n';
        code += '            width: 100%;\n';
        code += '            max-width: 800px;\n';
        code += '            margin: 0 auto;\n';
        code += '        }\n';
        code += '        .image-container img {\n';
        code += '            width: 100%;\n';
        code += '            height: auto;\n';
        code += '            display: block;\n';
        code += '        }\n';
        
        // 添加個別選擇區的樣式
        selections.forEach(selection => {
            const id = selection.id.replace('selection-', '');
            code += `        #element${id} {\n`;
            code += `            position: absolute;\n`;
            code += `            left: ${(selection.left * 100).toFixed(2)}%;\n`;
            code += `            top: ${(selection.top * 100).toFixed(2)}%;\n`;
            code += `            width: ${(selection.width * 100).toFixed(2)}%;\n`;
            code += `            height: ${(selection.height * 100).toFixed(2)}%;\n`;
            
            // 根據形狀添加對應的CSS
            if (selection.shape === 'circle') {
                code += `            border-radius: 50%;\n`;
            } else if (selection.shape === 'polygon') {
                code += `            clip-path: polygon(${selection.polygonPoints.map(p => `${p.x.toFixed(2)}% ${p.y.toFixed(2)}%`).join(', ')});\n`;
            }
            
            code += `            background-color: rgba(0, 123, 255, 0.3);\n`;
            code += `            cursor: pointer;\n`;
            
            // 添加懸停效果
            code += `        }\n`;
            code += `        #element${id}:hover {\n`;
            code += `            background-color: rgba(0, 123, 255, 0.5);\n`;
            code += `        }\n`;
        });
        
        // 添加HTML結構
        code += '    </style>\n';
        code += '</head>\n<body>\n';
        code += '    <div class="image-container">\n';
        code += `        <img src="${uploadedImage.src}" alt="Selected Image">\n`;
        
        // 添加所有選擇區的HTML
        selections.forEach(selection => {
            const id = selection.id.replace('selection-', '');
            code += `        <div id="element${id}" data-name="${selection.name}" data-description="${selection.description || ''}"></div>\n`;
        });
        
        code += '    </div>\n';
        
        // 添加點擊處理的JavaScript
        code += '    <script>\n';
        code += '        document.addEventListener("DOMContentLoaded", function() {\n';
        
        // 為每個選擇區添加點擊事件
        selections.forEach(selection => {
            const id = selection.id.replace('selection-', '');
            code += `            document.getElementById("element${id}").addEventListener("click", function() {\n`;
            code += `                alert("點擊了: ${selection.name}" + (this.dataset.description ? " - " + this.dataset.description : ""));\n`;
            code += '            });\n';
        });
        
        code += '        });\n';
        code += '    </script>\n';
        code += '</body>\n</html>';
        
        return code;
    }

    // 修改處理多邊形點擊事件函數，使用間接事件綁定方式解決冒泡問題
    function setupPolygonDrawing() {
        // 直接在圖片容器上添加點擊事件，專門處理多邊形繪製
        imageContainer.addEventListener('click', handlePolygonContainerClick);
    }

    // 在DOMContentLoaded事件末尾調用
    setupPolygonDrawing();

    // 處理圖片容器點擊，專門用於多邊形繪製
    function handlePolygonContainerClick(e) {
        // 只在多邊形模式下處理
        if (currentShape !== 'polygon') {
            return;
        }
        
        // 確保我們不在拖拽或調整大小狀態
        if (isResizing || (selectedElement && !isDrawingPolygon)) {
            return;
        }
        
        // 如果點擊的是多邊形以外的元素或者當前正在繪製多邊形
        if (isDrawingPolygon || e.target === imageContainer || e.target === uploadedImage) {
            const rect = imageContainer.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;
            
            // 獲取圖片位置
            const imgRect = uploadedImage.getBoundingClientRect();
            
            // 確保點擊在圖片上
            if (
                offsetX >= imgRect.left - rect.left && 
                offsetX <= imgRect.right - rect.left && 
                offsetY >= imgRect.top - rect.top && 
                offsetY <= imgRect.bottom - rect.top
            ) {
                handlePolygonClick(offsetX, offsetY, imgRect, rect, e);
                e.stopPropagation(); // 阻止事件冒泡
                e.preventDefault(); // 阻止默認行為
            }
        }
    }
});