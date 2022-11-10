#! /bin/bash

setup_actions() {
    ## create .env file
    if [ -f ".env" ]; then mv .env .env.backup; fi;
    cp .env.sample .env
}

setup_actions;