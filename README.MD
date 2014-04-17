CacheDash is a utility for developers to quickly hack around with memcached. The telnet interface gets old, and at the moment cachedash isn't much better. It's an ongoing project to provide a GUI for memory stores. 

Things you can help with:

- Rewrite the key watching mechanism in golang for better performance (use socketio golang package to cross process communicate).
- Fix the datatables binding with the key watching service. Deletes may not be working properly.
- Upgrade the memecached module (the cachedump functionality has been added to the module, so the custom hacked module isn't necessary anymore)
- Create mocha testing scripts.
- Bind the "eye" icon to the key watcher so that changes to "watched keys" are pushed with key changes. 

I'm one of those developers with a dayjob, family, and a life, so bear with me if I don't merge your code in immediately. 
