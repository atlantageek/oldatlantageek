require 'rubygems'
require 'rake'
require 'fileutils'

desc "Draft a new post"
task :new do
  puts "What should we call this post for now?"
  name = STDIN.gets.chomp
  FileUtils.touch("drafts/#{name}.md")

  open("drafts/#{name}.md", 'a') do |f|
    f.puts "---"
    f.puts "layout: post"
    f.puts "title: \"DRAFT: #{name}\""
    f.puts "---"
  end
end


desc "Startup Jekyll"
task :start do
  sh "jekyll server"
end

task :default => :start

desc 'Build and deploy'
task :deploy => :build do
  user = 'atlantag'
  host = 'atlantageek.com'
  directory = '/home/atlantag/public_html/wp'
  sh "rsync -rtzh --progress --delete _site/ #{user}@#{host}:#{directory}"
end

desc 'Build site with Jekyll'
task :build => :clean do
  submodule('update')
  jekyll('build') #('--lsi')
end

desc 'Clean up generated site'
task :clean do
  cleanup
end

def cleanup
  sh 'rm -rf _site'
end

def jekyll(opts = '')
  sh 'jekyll ' + opts
end

def submodule(opts = '')
  sh 'git submodule ' + opts
end

