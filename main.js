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
    const finishBtn = document.getElementById('finishBtn');
    const resetBtn = document.getElementById('resetBtn');
    const previewBtn = document.getElementById('previewBtn');
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
    });

    circleBtn.addEventListener('click', function() {
        currentShape = 'circle';
        circleBtn.classList.add('active');
        rectangleBtn.classList.remove('active');
    });

    // 完成按鈕
    finishBtn.addEventListener('click', function() {
        updateOutputResult();
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
            
            return `<div id="${selection.id}" 
                      data-name="${selection.name}" 
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
        
        // 處理刪除按鈕點擊
        if (target.classList.contains('delete-btn')) {
            deleteSelection(target.parentElement);
            return;
        }
        
        // 處理調整大小的處理器點擊
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
        
        // 處理選區拖動
        if (target.classList.contains('selection-area')) {
            selectedElement = target;
            startX = e.clientX;
            startY = e.clientY;
            
            document.body.classList.add('dragging');
            return;
        }
        
        // 創建新的選區
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

    // 繪製選擇區域
    imageContainer.addEventListener('mousemove', function(e) {
        if (!uploadedImage.src) return;
        
        const rect = imageContainer.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        
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
    function deleteSelection(element) {
        const id = element.id;
        const index = selections.findIndex(sel => sel.id === id);
        
        if (index !== -1) {
            selections.splice(index, 1);
            selectionsContainer.removeChild(element);
            updateSelectionsList();
            updateOutputResult();
        }
    }

    // 更新選區列表顯示
    function updateSelectionsList() {
        if (selections.length === 0) {
            noSelectionsText.classList.remove('hidden');
            selectionsList.innerHTML = '';
            selectionsList.appendChild(noSelectionsText);
            return;
        }
        
        noSelectionsText.classList.add('hidden');
        selectionsList.innerHTML = '';
        
        selections.forEach(selection => {
            const item = document.createElement('div');
            item.className = 'selection-list-item';
            
            const colorIndicator = document.createElement('span');
            colorIndicator.className = 'selection-color-indicator';
            colorIndicator.style.backgroundColor = 'rgba(0, 123, 255, 0.6)';
            colorIndicator.style.borderRadius = selection.shape === 'circle' ? '50%' : '3px';
            
            const info = document.createElement('div');
            info.className = 'selection-info';
            
            const percentLeft = (selection.left * 100).toFixed(2);
            const percentTop = (selection.top * 100).toFixed(2);
            const percentWidth = (selection.width * 100).toFixed(2);
            const percentHeight = (selection.height * 100).toFixed(2);
            
            info.innerHTML = `
                <strong>${selection.name}</strong> (${selection.shape})<br>
                位置: ${percentLeft}%, ${percentTop}% | 尺寸: ${percentWidth}%, ${percentHeight}%
            `;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm';
            deleteBtn.textContent = '刪除';
            deleteBtn.onclick = function() {
                deleteSelection(selection.elementRef);
            };
            
            item.appendChild(colorIndicator);
            item.appendChild(info);
            item.appendChild(deleteBtn);
            
            selectionsList.appendChild(item);
        });
        
        updateOutputResult();
        
        // 如果預覽已經顯示，更新預覽
        if (!previewContainer.classList.contains('hidden') && previewImage.src) {
            updatePreview();
        }
    }
    
    // 專門用於更新預覽的函數
    function updatePreview() {
        if (!uploadedImage.src || selections.length === 0) {
            return;
        }
        
        // 清空之前的預覽選區
        previewSelections.innerHTML = '';
        
        // 創建預覽選區
        selections.forEach(selection => {
            const previewSelection = document.createElement('div');
            previewSelection.id = `preview-${selection.id}`;
            previewSelection.className = 'absolute';
            
            // 設置形狀
            if (selection.shape === 'circle') {
                previewSelection.classList.add('rounded-full');
            }
            
            // 設置樣式 - 使用百分比保持相對位置
            previewSelection.style.left = `${selection.left * 100}%`;
            previewSelection.style.top = `${selection.top * 100}%`;
            previewSelection.style.width = `${selection.width * 100}%`;
            previewSelection.style.height = `${selection.height * 100}%`;
            previewSelection.style.border = '2px solid rgba(255, 0, 0, 0.7)';
            previewSelection.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
            previewSelection.style.position = 'absolute';
            
            // 添加標籤
            const label = document.createElement('div');
            label.className = 'absolute -top-6 left-0 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap';
            label.textContent = selection.name;
            previewSelection.appendChild(label);
            
            previewSelections.appendChild(previewSelection);
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
        
        const outputHTML = selections.map(selection => {
            const percentLeft = (selection.left * 100).toFixed(2);
            const percentTop = (selection.top * 100).toFixed(2);
            const percentWidth = (selection.width * 100).toFixed(2);
            const percentHeight = (selection.height * 100).toFixed(2);
            
            return `<div id="${selection.id}" 
                      data-name="${selection.name}" 
                      class="absolute ${selection.shape === 'circle' ? 'rounded-full' : ''}" 
                      style="left: ${percentLeft}%; top: ${percentTop}%; width: ${percentWidth}%; height: ${percentHeight}%;">
                  </div>`;
        }).join('\n');
        
        outputResult.textContent = outputHTML;
        
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
});