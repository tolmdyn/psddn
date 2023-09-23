#!/bin/bash

# Start a new Tmux session named "psddn-net"
tmux new-session -d -s psddn-net

#tmux select-layout tiled

# Split the terminal into four panes
# Navigate to the top-right pane and split it vertically
tmux select-pane -t psddn-net:0.0
tmux split-window -h

tmux select-pane -t psddn-net:0.1
tmux split-window -v

tmux select-pane -t psddn-net:0.0
tmux split-window -v

# Run scripts in each pane
tmux send-keys -t psddn-net:0.0 './tests/scripts/start.sh 1 eeQmqysi4h8KejMYdkO362ZMBPlvl6b3UXT2A8i8XVw= password' C-m
tmux send-keys -t psddn-net:0.1 './tests/scripts/start.sh 3 a3vAnpYdl1pSiWz9ozPRjA06PraEX2zCpNL1Ex2d0Lg= password' C-m
tmux send-keys -t psddn-net:0.2 './tests/scripts/start.sh 2 HoW5Z1M6VnEjV4g598HyaKhgDBtw5zNMyPeBZdADRbo= password' C-m
tmux send-keys -t psddn-net:0.3 './tests/scripts/start.sh 4 JhvMjAJcYa4gM5eSwL/w6PF1dc3i27MVEki4Pp7ia04= password' C-m

# Attach to the Tmux session
tmux attach -t psddn-net 
#!/bin/bash


# Run scripts in each pane
# tmux send-keys -t psddn-net:0.0 './tests/scripts/start.sh 1 yDOYiBOniM1yPZKaf+XuolTW3rMLOy0wjfsIf5qsVek= password' C-m
# tmux send-keys -t psddn-net:0.1 './tests/scripts/start.sh 3 IGLcKx+RUZQGMZeW/Y0PisZRLpYJrzu3a028Qo7KA4M= password' C-m
# tmux send-keys -t psddn-net:0.2 './tests/scripts/start.sh 2 8D1wAKY15WJ9EGIVZFAq9M9mygmXmEmCiZb42WmQSR0= password' C-m
# tmux send-keys -t psddn-net:0.3 './tests/scripts/start.sh 4 GHeyy7gzpkUQxwxFQwDuN2bgcWc13a0jvlbs2ZQTTlA= password' C-m