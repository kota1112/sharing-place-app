# spec/support/upload_helpers.rb
module UploadHelpers
    # 小さなダミー画像を一時ファイルとして作る
    def dummy_image_file(filename: 'sample.jpg', content_type: 'image/jpeg')
      tmp = Tempfile.new([File.basename(filename, '.*'), File.extname(filename)])
      tmp.binmode
      # 最小限のJPEGヘッダ/フッタ（SOI/EOI）。中身は読まれないのでこれで十分。
      tmp.write("\xFF\xD8\xFF\xD9")
      tmp.rewind
      Rack::Test::UploadedFile.new(tmp.path, content_type, original_filename: filename)
    end
  end
  
  RSpec.configure do |config|
    config.include UploadHelpers
  end