# lib/tasks/solid_bootstrap.rake
# Solid Cache / Queue / Cable のテーブルが無ければ schema を安全にロードする
# 破壊的な reset は行わず、存在チェックしてから作成します。
namespace :solid do
  desc "Create Solid tables (cache/queue/cable) if missing by loading *_schema.rb"
  task bootstrap: :environment do
    checks = [
      { label: "cache", table: "solid_cache_entries",  schema: Rails.root.join("db/cache_schema.rb")  },
      { label: "queue", table: "solid_queue_jobs",     schema: Rails.root.join("db/queue_schema.rb")  },
      { label: "cable", table: "solid_cable_messages", schema: Rails.root.join("db/cable_schema.rb")  }
    ]

    created = []
    skipped = []

    checks.each do |c|
      print "[solid] #{c[:label]}: checking #{c[:table]} ... "
      if ActiveRecord::Base.connection.data_source_exists?(c[:table])
        puts "exists (skip)"
        skipped << c[:label]
        next
      end

      unless File.exist?(c[:schema])
        puts "schema missing: #{c[:schema]}"
        next
      end

      puts "creating via #{c[:schema]} ..."
      begin
        load c[:schema]
        if ActiveRecord::Base.connection.data_source_exists?(c[:table])
          puts "-> ok"
          created << c[:label]
        else
          puts "-> not found after load (check schema file)"
        end
      rescue => e
        puts "-> ERROR: #{e.class}: #{e.message}"
      end
    end

    puts "\n[solid] summary"
    puts "  created: #{created.join(', ').presence || '(none)'}"
    puts "  skipped: #{skipped.join(', ').presence || '(none)'}"
  end
end
