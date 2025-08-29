#!/bin/bash
# Create simple PNG icons using ImageMagick (if available) or just create placeholder files

create_icon() {
    local size=$1
    local filename="icons/icon${size}.png"
    
    # Try to create with ImageMagick if available
    if command -v convert >/dev/null 2>&1; then
        convert -size ${size}x${size} xc:'#4285f4' \
                -fill white -stroke white -strokewidth 2 \
                -draw "circle $((size/3)),$((size/2)) $((size/3+size/6)),$((size/2))" \
                -draw "rectangle $((size/2)),$((size/2-size/16)) $((size*3/4)),$((size/2+size/16))" \
                -draw "rectangle $((size*3/4)),$((size/2-size/8)) $((size*7/8)),$((size/2-size/16))" \
                -draw "rectangle $((size*3/4)),$((size/2+size/16)) $((size*7/8)),$((size/2+size/8))" \
                "$filename"
        echo "Created $filename with ImageMagick"
    else
        # Create a simple colored square as fallback
        echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA3mDkWwAAAABJRU5ErkJggg==" | base64 -d > "$filename"
        echo "Created placeholder $filename"
    fi
}

# Create icons
for size in 16 32 48 128; do
    create_icon $size
done

echo "Icon creation complete!"
