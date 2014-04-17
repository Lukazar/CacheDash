module.exports = function(grunt) {
  grunt.initConfig({
//config options for each module
   cfg: {
     handlebars : {
       memcache : {
         in : 'public/partials/memcache/*.hbs',
         out : 'public/partials/memcache/templates.js'
       }
     }
   },
   watch: {
     handlebars : { 
       files : ['<%= cfg.handlebars.memcache.in %>'],
       tasks : ['handlebars:compile']
     }
   },
   handlebars: {
     compile: {
       options : {
          namespace: 'Dash.Templates'
       },
       files: [{
         src : '<%= cfg.handlebars.memcache.in %>',
         dest : '<%= cfg.handlebars.memcache.out %>'
       }]
     }
   }   
  });
  grunt.loadNpmTasks('grunt-contrib-handlebars');
  grunt.loadNpmTasks('grunt-contrib-watch');

  //task will monitor code changes &re-compile/reconfig on changes
  grunt.registerTask('mon', ['watch']);
  grunt.registerTask('default', ['handlebars']);
};
