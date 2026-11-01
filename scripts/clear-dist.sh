dirs=(
    # "node_modules"
    # web
    "dist"
    "stats.html"
)

for dir in ${dirs[@]}; do
    if [ -e $dir ]; then
        echo "rm -rf $dir"
        rm -rf $dir
    fi
done
